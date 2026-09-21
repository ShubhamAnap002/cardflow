import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import {
  DEFAULT_STITCH_PATH,
  STITCH_NAV_INJECT,
  STITCH_SCREENS,
  type StitchPath,
} from '@/lib/stitch';

function isStitchPath(value: string): value is StitchPath {
  return value in STITCH_SCREENS;
}

function applyNavigation(raw: string, setPath: (path: StitchPath) => void) {
  try {
    const data = JSON.parse(raw) as { type?: string; path?: string };
    if (data.type === 'navigate' && data.path && isStitchPath(data.path)) {
      setPath(data.path);
    }
  } catch {
    // ignore
  }
}

async function loadStitchHtml(path: StitchPath) {
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

/** Thin host — only loads your Stitch HTML + wires data-path navigation */
export function StitchHost() {
  const [path, setPath] = useState<StitchPath>(DEFAULT_STITCH_PATH);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);

    loadStitchHtml(path)
      .then((content) => {
        if (!cancelled) setHtml(content);
      })
      .catch((error) => {
        console.error('Failed to load Stitch screen', path, error);
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const onWindowMessage = (event: MessageEvent) => {
      const raw =
        typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
      applyNavigation(raw, setPath);
    };

    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    applyNavigation(event.nativeEvent.data, setPath);
  }, []);

  if (!html) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#2563EB" size="large" />
      </View>
    );
  }

  if (Platform.OS === 'web') {
    const withNav = html.includes('</body>')
      ? html.replace('</body>', `<script>${STITCH_NAV_INJECT}</script></body>`)
      : `${html}<script>${STITCH_NAV_INJECT}</script>`;

    return (
      <View style={styles.root}>
        {/* @ts-expect-error web iframe hosts exact Stitch HTML */}
        <iframe
          key={path}
          srcDoc={withNav}
          title="CardFlow"
          style={styles.iframe as unknown as ViewStyle}
        />
      </View>
    );
  }

  return (
    <WebView
      key={path}
      source={{ html, baseUrl: 'https://localhost' }}
      originWhitelist={['*']}
      onMessage={onMessage}
      injectedJavaScript={STITCH_NAV_INJECT}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      style={styles.webview}
    />
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
  iframe: { borderWidth: 0, width: '100%', height: '100%' },
});
