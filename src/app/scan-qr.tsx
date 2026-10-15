import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { colors, radii, spacing, type } from '@/constants/theme';
import { EMPTY_DRAFT } from '@/lib/contact-draft';
import { notify } from '@/lib/feedback';
import { dismissToHome } from '@/lib/navigation';
import { parseQrPayload, stageQrDraft, draftFromWebsiteUrl } from '@/lib/qr-card';
import { openWebUrl } from '@/lib/url-safety';

/**
 * Live QR scanner → stage draft → `/review?source=qr`.
 * Does not touch OCR quota or the camera/gallery card path.
 */
export default function ScanQrScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [torch, setTorch] = useState(false);
  const lockedRef = useRef(false);
  const lastRaw = useRef('');
  const lastAt = useRef(0);

  const unlock = useCallback(() => {
    lockedRef.current = false;
    setLocked(false);
  }, []);

  const openReview = useCallback(async (draft: typeof EMPTY_DRAFT) => {
    await stageQrDraft(draft);
    router.replace({ pathname: '/review', params: { source: 'qr' } });
  }, []);

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      // Sync guard — state `locked` alone can miss a double-fire before re-render.
      if (lockedRef.current) return;
      const now = Date.now();
      if (data === lastRaw.current && now - lastAt.current < 1600) return;
      lastRaw.current = data;
      lastAt.current = now;

      const result = parseQrPayload(data);

      if (result.kind === 'contact') {
        lockedRef.current = true;
        setLocked(true);
        void openReview(result.draft).catch(() => {
          unlock();
          notify('Could not open the contact form.');
        });
        return;
      }

      if (result.kind === 'url') {
        lockedRef.current = true;
        setLocked(true);
        Alert.alert(
          'Web link found',
          'This QR is a web link, not a contact card. You can open it or save the full profile URL.',
          [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: unlock,
          },
          {
            text: 'Open link',
            onPress: () => {
              openWebUrl(result.url, { title: 'Open QR link', onSettled: unlock });
            },
          },
          {
            text: 'Save profile link',
            onPress: () => {
              void openReview(draftFromWebsiteUrl(result.url)).catch(() => {
                unlock();
                notify('Could not open the contact form.');
              });
            },
          },
        ]);
        return;
      }

      lockedRef.current = true;
      setLocked(true);
      Alert.alert(
        'Unrecognized QR',
        'This code is not a contact card. You can save the raw text in a note, or cancel.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: unlock,
          },
          {
            text: 'Save as note',
            onPress: () => {
              void openReview({
                ...EMPTY_DRAFT,
                name: 'Scanned code',
                note: result.raw.slice(0, 2000),
              }).catch(() => {
                unlock();
                notify('Could not open the contact form.');
              });
            },
          },
        ]
      );
    },
    [openReview, unlock]
  );

  if (!permission) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.rootLight, styles.center, { padding: spacing.lg }]}>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permBody}>
          Allow camera access to scan contact QR codes into CardFlow.
        </Text>
        <PrimaryButton label="Allow camera" icon="photo_camera" onPress={() => void requestPermission()} />
        <Pressable onPress={dismissToHome} style={styles.linkBtn}>
          <Text style={styles.linkText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {locked ? (
        <View style={[StyleSheet.absoluteFill, styles.paused]} />
      ) : (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onBarcodeScanned}
        />
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={dismissToHome}
          style={styles.closeBtn}
        >
          <Icon name="close" size={22} color={colors.onPrimary} />
        </Pressable>
        <Text style={styles.topTitle}>Scan QR</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={torch ? 'Turn flashlight off' : 'Turn flashlight on'}
          onPress={() => setTorch((v) => !v)}
          style={styles.closeBtn}
        >
          <Icon name={torch ? 'flash_on' : 'flash_off'} size={22} color={colors.onPrimary} />
        </Pressable>
      </View>

      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>
          {locked ? 'Opening…' : 'Align a contact QR inside the frame'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.scanCanvas },
  paused: { backgroundColor: colors.scanCanvas },
  rootLight: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  permTitle: { ...type.headline, color: colors.onSurface, textAlign: 'center' },
  permBody: { ...type.bodySm, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.sm },
  linkBtn: { padding: spacing.sm },
  linkText: { ...type.labelLg, color: colors.primary, fontWeight: '700' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    zIndex: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topTitle: { ...type.labelLg, color: colors.onPrimary, fontWeight: '700' },
  frameWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'transparent',
  },
  hint: {
    ...type.bodySm,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
