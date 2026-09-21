import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ProfileModal } from '@/components/profile-modal';
import { ScanSourceSheet } from '@/components/scan-source-sheet';
import {
  DEFAULT_STITCH_PATH,
  isStitchPath,
  prepareStitchHtml,
  STITCH_BRIDGE_INJECT,
  STITCH_SCREENS,
  type StitchPath,
} from '@/lib/stitch';

/** Screens are either bundled assets (number) or inline HTML strings. */
async function loadRawHtml(path: StitchPath) {
  const source = STITCH_SCREENS[path];
  if (typeof source === 'string') return source;

  const asset = Asset.fromModule(source);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error(`Missing asset for "${path}"`);

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Failed to fetch "${path}" (${response.status})`);
    return response.text();
  }

  return FileSystem.readAsStringAsync(uri);
}

const LOAD_TIMEOUT_MS = 15000;
/** Injecting very large base64 blobs stalls the WebView, so cap the preview. */
const MAX_PREVIEW_BYTES = 4_000_000;

function Toast({ message }: { message: string }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [message, opacity]);

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

export function StitchHost() {
  const [stack, setStack] = useState<StitchPath[]>([DEFAULT_STITCH_PATH]);
  const path = stack[stack.length - 1] ?? DEFAULT_STITCH_PATH;

  const [html, setHtml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [scanOpen, setScanOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const webRef = useRef<WebView>(null);
  const capturedCard = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathRef = useRef(path);
  pathRef.current = path;

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    []
  );

  const push = useCallback((next: StitchPath) => {
    setStack((prev) => (prev[prev.length - 1] === next ? prev : [...prev, next]));
  }, []);

  const back = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const resetTo = useCallback((next: StitchPath) => {
    setStack(next === DEFAULT_STITCH_PATH ? [DEFAULT_STITCH_PATH] : [DEFAULT_STITCH_PATH, next]);
  }, []);

  // Android hardware back used to quit the app from any screen.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (profileOpen) {
        setProfileOpen(false);
        return true;
      }
      if (scanOpen) {
        setScanOpen(false);
        return true;
      }
      if (stack.length > 1) {
        back();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [back, profileOpen, scanOpen, stack.length]);

  // Load (and re-load on retry) the current screen.
  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setLoadError(null);

    const timeout = setTimeout(() => {
      if (!cancelled) setLoadError('This screen is taking too long to load.');
    }, LOAD_TIMEOUT_MS);

    loadRawHtml(path)
      .then((raw) => {
        if (cancelled) return;
        setHtml(prepareStitchHtml(raw, path));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Failed to load Stitch screen', path, error);
        setLoadError(error instanceof Error ? error.message : 'Unknown error');
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [path, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const openExternal = useCallback(
    async (url: string, emptyMessage: string, failMessage: string) => {
      const target = url.trim();
      if (!target || /:$/.test(target)) {
        showToast(emptyMessage);
        return;
      }
      try {
        await Linking.openURL(target);
      } catch {
        showToast(failMessage);
      }
    },
    [showToast]
  );

  const runCapture = useCallback(
    async (source: 'camera' | 'gallery') => {
      if (capturing) return;
      setScanOpen(false);
      setCapturing(true);

      try {
        const permission =
          source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            source === 'camera' ? 'Camera access needed' : 'Photo access needed',
            source === 'camera'
              ? 'CardFlow needs the camera to scan business cards. Enable it in Settings to continue.'
              : 'CardFlow needs photo access to import cards. Enable it in Settings to continue.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => void Linking.openSettings() },
            ]
          );
          return;
        }

        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({
                quality: 0.6,
                allowsEditing: false,
                base64: true,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.6,
                allowsMultipleSelection: false,
                base64: true,
              });

        if (result.canceled) return;

        const asset = result.assets?.[0];
        if (!asset) {
          showToast('No image captured — please try again.');
          return;
        }

        capturedCard.current =
          asset.base64 && asset.base64.length < MAX_PREVIEW_BYTES
            ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
            : null;

        showToast(
          source === 'camera' ? 'Card captured — reading details…' : 'Image imported — reading details…'
        );
        push('scan-processing');

        // Only advance if the user is still waiting on the processing screen.
        if (advanceTimer.current) clearTimeout(advanceTimer.current);
        advanceTimer.current = setTimeout(() => {
          if (pathRef.current === 'scan-processing') push('scan-review');
        }, 1500);
      } catch (error) {
        console.error('Capture failed', error);
        Alert.alert('Scan failed', 'Something went wrong while capturing the card. Please try again.');
      } finally {
        setCapturing(false);
      }
    },
    [capturing, push, showToast]
  );

  /** Send the captured card into the Stitch screen once it signals readiness. */
  const pushCapturedCard = useCallback(() => {
    const image = capturedCard.current;
    if (!image) return;
    if (path !== 'scan-processing' && path !== 'scan-review') return;
    webRef.current?.injectJavaScript(
      `window.cfApply && window.cfApply(${JSON.stringify({ cardImage: image })}); true;`
    );
  }, [path]);

  const confirmSaved = useCallback(() => {
    Alert.alert('Contact saved', 'The card has been added to your contacts.', [
      { text: 'Scan another', onPress: () => setScanOpen(true) },
      {
        text: 'View contacts',
        style: 'cancel',
        onPress: () => {
          capturedCard.current = null;
          resetTo('contacts');
        },
      },
    ]);
  }, [resetTo]);

  const handleMessage = useCallback(
    (raw: string) => {
      let data: {
        type?: string;
        path?: string;
        source?: 'camera' | 'gallery' | 'menu';
        message?: string;
        value?: string;
      };

      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }

      switch (data.type) {
        case 'ready':
          pushCapturedCard();
          return;
        case 'navigate': {
          if (data.path === 'card-scanner') {
            setScanOpen(true);
            return;
          }
          if (data.path && isStitchPath(data.path)) push(data.path);
          else if (data.path) showToast('That screen is not available yet.');
          return;
        }
        case 'back':
          if (stack.length > 1) back();
          else showToast('You are on the home screen.');
          return;
        case 'scan': {
          if (data.source === 'camera' || data.source === 'gallery') {
            void runCapture(data.source);
            return;
          }
          setScanOpen(true);
          return;
        }
        case 'profile':
          setProfileOpen(true);
          return;
        case 'settings':
          push('settings');
          return;
        case 'save-contact':
          confirmSaved();
          return;
        case 'toast':
          if (data.message) showToast(data.message);
          return;
        case 'call':
          void openExternal(
            `tel:${data.value ?? ''}`,
            'No phone number on this card.',
            'No dialer available on this device.'
          );
          return;
        case 'email':
          void openExternal(
            `mailto:${data.value ?? ''}`,
            'No email address on this card.',
            'No mail app available on this device.'
          );
          return;
        default:
          return;
      }
    },
    [back, confirmSaved, openExternal, push, pushCapturedCard, runCapture, showToast, stack.length]
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onWindowMessage = (event: MessageEvent) => {
      const raw = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
      handleMessage(raw);
    };
    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
  }, [handleMessage]);

  const onWebMessage = useCallback(
    (event: WebViewMessageEvent) => handleMessage(event.nativeEvent.data),
    [handleMessage]
  );

  const htmlWithBridge = useMemo(() => {
    if (!html) return null;
    const script = `<script>${STITCH_BRIDGE_INJECT}</script>`;
    return html.includes('</body>') ? html.replace('</body>', `${script}</body>`) : `${html}${script}`;
  }, [html]);

  /** tel:/mailto: and external links must be handed to the OS, not the WebView. */
  const onShouldStartLoad = useCallback(
    (request: { url: string; isTopFrame?: boolean }) => {
      const url = request.url ?? '';
      // Subresources (Tailwind, fonts) and the document itself must load normally.
      if (request.isTopFrame === false) return true;
      if (
        url.startsWith('about:') ||
        url.startsWith('data:') ||
        url.startsWith('file:') ||
        url.startsWith('https://localhost')
      ) {
        return true;
      }
      if (/^(mailto|tel|sms):/i.test(url)) {
        void openExternal(url, 'Nothing to open here.', 'No app available to open this link.');
        return false;
      }
      if (/^https?:/i.test(url)) {
        void Linking.openURL(url).catch(() => showToast('Could not open that link.'));
        return false;
      }
      return true;
    },
    [openExternal, showToast]
  );

  return (
    <View style={styles.root}>
      {loadError ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Screen could not load</Text>
          <Text style={styles.errorBody}>{loadError}</Text>
          <View style={styles.errorActions}>
            <Pressable style={[styles.errorBtn, styles.errorBtnPrimary]} onPress={retry}>
              <Text style={styles.errorBtnPrimaryText}>Try again</Text>
            </Pressable>
            {path !== DEFAULT_STITCH_PATH ? (
              <Pressable
                style={[styles.errorBtn, styles.errorBtnGhost]}
                onPress={() => resetTo(DEFAULT_STITCH_PATH)}
              >
                <Text style={styles.errorBtnGhostText}>Go home</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : !htmlWithBridge ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563EB" size="large" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : Platform.OS === 'web' ? (
        <iframe
          key={`${path}-${attempt}`}
          srcDoc={htmlWithBridge}
          title="CardFlow"
          style={{ border: 'none', width: '100%', height: '100%' }}
        />
      ) : (
        <WebView
          ref={webRef}
          key={`${path}-${attempt}`}
          source={{ html: htmlWithBridge, baseUrl: 'https://cdn.tailwindcss.com/' }}
          originWhitelist={['*']}
          onMessage={onWebMessage}
          onShouldStartLoadWithRequest={onShouldStartLoad}
          onError={({ nativeEvent }) =>
            setLoadError(nativeEvent.description || 'The screen failed to render.')
          }
          onRenderProcessGone={retry}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          allowFileAccess
          allowUniversalAccessFromFileURLs
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          overScrollMode="never"
          androidLayerType="hardware"
          style={styles.webview}
        />
      )}

      <ScanSourceSheet
        visible={scanOpen}
        busy={capturing}
        onClose={() => setScanOpen(false)}
        onCamera={() => void runCapture('camera')}
        onGallery={() => void runCapture('gallery')}
      />

      <ProfileModal visible={profileOpen} onClose={() => setProfileOpen(false)} onSaved={showToast} />

      {toast ? <Toast message={toast} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf8ff' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf8ff',
    padding: 28,
  },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 13 },
  webview: { flex: 1, backgroundColor: '#faf8ff' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  errorBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
  },
  errorActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  errorBtn: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 22 },
  errorBtnPrimary: { backgroundColor: '#2563EB' },
  errorBtnPrimaryText: { color: '#fff', fontWeight: '700' },
  errorBtnGhost: { backgroundColor: '#EEF2F9' },
  errorBtnGhostText: { color: '#334155', fontWeight: '600' },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    backgroundColor: 'rgba(15,23,42,0.94)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toastText: { color: '#fff', fontSize: 14, textAlign: 'center' },
});
