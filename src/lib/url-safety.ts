import { Alert, Linking } from 'react-native';

import { notify } from '@/lib/feedback';
import { hostLabelFromUrl, withHttpScheme } from '@/lib/website-url';

export { looksLikeWebsiteUrl } from '@/lib/website-url';

/**
 * Open a web URL; confirm first so QR / contact links are less phishing-prone.
 * http always warns; https shows the host once.
 */
export function openWebUrl(
  rawUrl: string,
  opts?: { title?: string; onSettled?: () => void }
): void {
  const url = withHttpScheme(rawUrl);
  const host = hostLabelFromUrl(url);
  const isHttps = /^https:\/\//i.test(url);
  const title = opts?.title ?? 'Open link';
  const done = () => opts?.onSettled?.();

  const open = () => {
    void Linking.openURL(url)
      .catch(() => notify('Could not open that link.'))
      .finally(done);
  };

  if (!isHttps) {
    Alert.alert(
      'Not a secure link',
      `${host} uses http (not https). Open anyway?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: done },
        { text: 'Open', style: 'destructive', onPress: open },
      ]
    );
    return;
  }

  Alert.alert(title, `Open ${host}?`, [
    { text: 'Cancel', style: 'cancel', onPress: done },
    { text: 'Open', onPress: open },
  ]);
}
