import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ProfileModal } from '@/components/profile-modal';
import { ScanSourceSheet } from '@/components/scan-source-sheet';
import {
  DEFAULT_STITCH_PATH,
  prepareStitchHtml,
  STITCH_BRIDGE_INJECT,
  STITCH_SCREENS,
  type StitchPath,
} from '@/lib/stitch';

function isStitchPath(value: string): value is StitchPath {
  return value in STITCH_SCREENS;
}

async function loadRawHtml(path: StitchPath) {
  const asset = Asset.fromModule(STITCH_SCREENS[path]);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error('Stitch asset URI missing');

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Failed to fetch ${path}`);
    return response.text();
  }

  return FileSystem.readAsStringAsync(uri);
}

export function StitchHost() {
  const [stack, setStack] = useState<StitchPath[]>([DEFAULT_STITCH_PATH]);
  const path = stack[stack.length - 1] ?? DEFAULT_STITCH_PATH;
  const [html, setHtml] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const webRef = useRef<WebView>(null);

  const push = useCallback((next: StitchPath) => {
    setStack((prev) => (prev[prev.length - 1] === next ? prev : [...prev, next]));
  }, []);

  const back = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);

    loadRawHtml(path)
      .then((raw) => {
        if (!cancelled) setHtml(prepareStitchHtml(raw));
      })
      .catch((error) => {
        console.error('Failed to load Stitch screen', path, error);
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  const runCapture = useCallback(
    async (source: 'camera' | 'gallery') => {
      setScanOpen(false);

      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          source === 'camera'
            ? 'Allow camera access to scan cards.'
            : 'Allow photo library access to import cards.'
        );
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              quality: 0.8,
              allowsEditing: false,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.8,
              allowsMultipleSelection: false,
            });

      if (result.canceled) return;

      push('scan-processing');
      setTimeout(() => push('scan-review'), 1200);
    },
    [push]
  );

  const handleMessage = useCallback(
    (raw: string) => {
      try {
        const data = JSON.parse(raw) as {
          type?: string;
          path?: string;
          source?: 'camera' | 'gallery' | 'menu';
          message?: string;
          value?: string;
        };

        switch (data.type) {
          case 'navigate': {
            if (data.path === 'card-scanner') {
              setScanOpen(true);
              return;
            }
            if (data.path && isStitchPath(data.path)) push(data.path);
            return;
          }
          case 'back':
            back();
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
          case 'toast':
            if (data.message) Alert.alert('CardFlow', data.message);
            return;
          case 'call':
            void Linking.openURL(`tel:${data.value || ''}`);
            return;
          case 'email':
            void Linking.openURL(`mailto:${data.value || ''}`);
            return;
          default:
            break;
        }
      } catch {
        // ignore
      }
    },
    [back, push, runCapture]
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onWindowMessage = (event: MessageEvent) => {
      const raw =
        typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
      handleMessage(raw);
    };
    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
  }, [handleMessage]);

  const onWebMessage = useCallback(
    (event: WebViewMessageEvent) => {
      handleMessage(event.nativeEvent.data);
    },
    [handleMessage]
  );

  const htmlWithBridge = html
    ? html.includes('</body>')
      ? html.replace('</body>', `<script>${STITCH_BRIDGE_INJECT}</script></body>`)
      : `${html}<script>${STITCH_BRIDGE_INJECT}</script>`
    : null;

  return (
    <View style={styles.root}>
      {!htmlWithBridge ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#2563EB" size="large" />
        </View>
      ) : Platform.OS === 'web' ? (
        <iframe
          key={path}
          srcDoc={htmlWithBridge}
          title="CardFlow"
          style={{ border: 'none', width: '100%', height: '100%' }}
        />
      ) : (
        <WebView
          ref={webRef}
          key={path}
          source={{ html: htmlWithBridge, baseUrl: 'https://localhost' }}
          originWhitelist={['*']}
          onMessage={onWebMessage}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          style={styles.webview}
        />
      )}

      <ScanSourceSheet
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onCamera={() => void runCapture('camera')}
        onGallery={() => void runCapture('gallery')}
      />

      <ProfileModal visible={profileOpen} onClose={() => setProfileOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf8ff' },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf8ff',
  },
  webview: { flex: 1, backgroundColor: '#faf8ff' },
});
