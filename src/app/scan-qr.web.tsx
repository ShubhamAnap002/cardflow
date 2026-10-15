import { router } from 'expo-router';
import jsQR from 'jsqr';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Icon } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { colors, radii, spacing, type } from '@/constants/theme';
import { EMPTY_DRAFT } from '@/lib/contact-draft';
import { confirm, notify } from '@/lib/feedback';
import { dismissToHome } from '@/lib/navigation';
import { draftFromWebsiteUrl, parseQrPayload, stageQrDraft } from '@/lib/qr-card';
import { openWebUrl } from '@/lib/url-safety';

export default function ScanQrScreenWeb() {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  const [busyFile, setBusyFile] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lockedRef = useRef(false);

  const unlock = useCallback(() => {
    lockedRef.current = false;
    setLocked(false);
  }, []);

  const openReview = useCallback(async (draft: typeof EMPTY_DRAFT) => {
    await stageQrDraft(draft);
    router.replace({ pathname: '/review', params: { source: 'qr' } });
  }, []);

  const handleQrData = useCallback(
    (data: string) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setLocked(true);

      const result = parseQrPayload(data);

      if (result.kind === 'contact') {
        void openReview(result.draft).catch(() => {
          unlock();
          notify('Could not open the contact form.');
        });
        return;
      }

      if (result.kind === 'url') {
        confirm(
          'Web link found',
          `Found URL: ${result.url}\n\nClick OK to save as contact, or Cancel to open in browser.`,
          'Save',
          () => {
            void openReview(draftFromWebsiteUrl(result.url)).catch(() => {
              unlock();
              notify('Could not open the contact form.');
            });
          }
        );
        // If not saved, allow opening link
        openWebUrl(result.url, { title: 'Open QR link', onSettled: unlock });
        return;
      }

      confirm(
        'Unrecognized QR',
        'This code is not a standard contact card. Would you like to save the raw text in a note?',
        'Save as note',
        () => {
          void openReview({
            ...EMPTY_DRAFT,
            name: 'Scanned code',
            note: result.raw.slice(0, 2000),
          }).catch(() => {
            unlock();
            notify('Could not open the contact form.');
          });
        }
      );
      unlock();
    },
    [openReview, unlock]
  );

  // Initialize web camera
  useEffect(() => {
    let active = true;

    async function initCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (active) setHasCamera(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          void videoRef.current.play();
        }
        setHasCamera(true);
      } catch {
        if (active) setHasCamera(false);
      }
    }

    void initCamera();

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Frame processing loop for QR decoding
  useEffect(() => {
    if (!hasCamera) return;

    function scanFrame() {
      if (lockedRef.current) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            handleQrData(code.data);
            return;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [hasCamera, handleQrData]);

  // Decode QR from uploaded image file
  function handleFileQr(file: File) {
    setBusyFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          notify('Could not decode that image.');
          setBusyFile(false);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        setBusyFile(false);

        if (code && code.data) {
          handleQrData(code.data);
        } else {
          notify('No QR code found in that image.');
        }
      };
      img.onerror = () => {
        notify('Could not read image file.');
        setBusyFile(false);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  return (
    <View style={styles.root}>
      {/* Hidden file input for uploading QR images */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileQr(file);
        }}
      />

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {hasCamera === null ? (
        <View style={[styles.root, styles.center]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.hint}>Initializing camera…</Text>
        </View>
      ) : hasCamera ? (
        <>
          <video
            ref={videoRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />

          <View style={styles.frameWrap} pointerEvents="none">
            <View style={styles.frame} />
            <Text style={styles.hint}>
              {locked ? 'Opening…' : 'Align a contact QR inside the frame'}
            </Text>
          </View>
        </>
      ) : (
        <View style={[styles.rootLight, styles.center, { padding: spacing.lg }]}>
          <Icon name="qr_code_2" size={56} color={colors.primary} />
          <Text style={styles.permTitle}>Webcam Unavailable</Text>
          <Text style={styles.permBody}>
            CardFlow could not access a webcam on this browser, or permission was not granted.
            You can upload a QR image directly from your files.
          </Text>
          <PrimaryButton
            label={busyFile ? 'Reading QR…' : 'Upload QR image'}
            icon="file_upload"
            disabled={busyFile}
            onPress={() => fileInputRef.current?.click()}
          />
          <Pressable onPress={dismissToHome} style={styles.linkBtn}>
            <Text style={styles.linkText}>Back to Home</Text>
          </Pressable>
        </View>
      )}

      {/* Top Bar Navigation */}
      <View style={styles.topBar}>
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
          accessibilityLabel="Upload QR code from file"
          onPress={() => fileInputRef.current?.click()}
          style={styles.closeBtn}
        >
          <Icon name="file_upload" size={22} color={colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.scanCanvas, position: 'relative' },
  rootLight: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  permTitle: { ...type.headline, color: colors.onSurface, textAlign: 'center' },
  permBody: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.sm,
    maxWidth: 380,
  },
  linkBtn: { padding: spacing.sm },
  linkText: { ...type.labelLg, color: colors.primary, fontWeight: '700' },
  topBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  topTitle: { ...type.labelLg, color: colors.onPrimary, fontWeight: '700' },
  frameWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    zIndex: 5,
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
