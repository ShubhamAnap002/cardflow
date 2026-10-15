import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { Chip } from '@/components/chip';
import { ExportCard, ExportCardCaptureHost } from '@/components/export-card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { EmptyState } from '@/components/tiles';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import {
  fieldsForExportCard,
} from '@/lib/export-card-fields';
import {
  shareExportCardImage,
  type ExportCardViewRef,
} from '@/lib/card-export';
import { notify } from '@/lib/feedback';
import {
  canUseLimitedQr,
  encodeProfileAsVCard,
  profileHasShareableFields,
  resolveQrDetailMode,
  type QrDetailMode,
} from '@/lib/qr-card';
import { shareQrPngBase64 } from '@/lib/qr-share';
import { DEFAULT_PROFILE, loadProfile, type Profile } from '@/lib/storage';

type QrSvg = { toDataURL: (cb: (data: string) => void) => void };

export default function MyQrScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<QrDetailMode>('full');
  const [payload, setPayload] = useState('');
  const [busy, setBusy] = useState(false);
  const initialLoadDone = useRef(false);
  const qrRef = useRef<QrSvg | null>(null);
  const cardRef = useRef<ExportCardViewRef | null>(null);

  const reload = useCallback(() => {
    let alive = true;
    if (!initialLoadDone.current) setLoading(true);
    void loadProfile().then((stored) => {
      if (!alive) return;
      setProfile(stored);
      initialLoadDone.current = true;
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cancel = reload();
      return cancel;
    }, [reload])
  );

  useEffect(() => {
    if (!profileHasShareableFields(profile)) {
      setPayload('');
      return;
    }
    const effective = resolveQrDetailMode(profile, mode);
    if (mode === 'limited' && effective === 'full') {
      setMode('full');
      return;
    }
    setPayload(encodeProfileAsVCard(profile, effective));
  }, [profile, mode]);

  const exportFields = fieldsForExportCard(profile, mode);

  function chooseLimited() {
    if (!canUseLimitedQr(profile)) {
      notify('Add a name or phone to use Limited QR.');
      return;
    }
    setMode('limited');
  }

  function onShareMenu() {
    if (!payload) return;
    Alert.alert('Share your card', 'Choose how to share.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share card image',
        onPress: () => void shareCardImage(),
      },
      {
        text: 'Share QR image',
        onPress: () => void shareImage(),
      },
      {
        text: 'Share contact (vCard)',
        onPress: () => void shareVcard(),
      },
    ]);
  }

  async function shareVcard() {
    try {
      await Share.share({
        message: payload,
        title: 'My CardFlow contact',
      });
    } catch {
      notify('Could not open the share sheet.');
    }
  }

  async function shareCardImage() {
    setBusy(true);
    try {
      await shareExportCardImage(cardRef, 'cardflow-my-card.png');
    } finally {
      setBusy(false);
    }
  }

  async function shareImage() {
    const svg = qrRef.current;
    if (!svg?.toDataURL) {
      notify('QR is not ready yet. Try again in a moment.');
      return;
    }
    setBusy(true);
    try {
      await new Promise<void>((resolve, reject) => {
        svg.toDataURL((data) => {
          void shareQrPngBase64(data, 'cardflow-my-qr.png')
            .then(resolve)
            .catch(reject);
        });
      });
    } catch {
      notify('Could not share the QR image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="My QR code" eyebrow="YOUR CARD" onBack={() => router.back()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <ScreenBody contentStyle={styles.content}>
            {!payload ? (
              <EmptyState
                icon="person"
                title="Add your details first"
                body="Save your name, email, phone, or website so others can scan you into contacts."
                action={
                  <PrimaryButton
                    label="Edit profile"
                    icon="person"
                    onPress={() => router.push('/profile')}
                  />
                }
              />
            ) : (
              <>
                <Text style={styles.intro}>
                  Others can scan this with CardFlow or most phone cameras to save your contact.
                </Text>

                <View style={styles.modeRow}>
                  <Chip
                    label="Full details"
                    selected={mode === 'full'}
                    onPress={() => setMode('full')}
                  />
                  <Chip
                    label="Limited"
                    selected={mode === 'limited'}
                    onPress={chooseLimited}
                  />
                </View>

                <View style={styles.qrCard}>
                  <QRCode
                    value={payload}
                    size={220}
                    color={colors.onSurface}
                    backgroundColor={colors.surface}
                    ecl="M"
                    getRef={(c) => {
                      qrRef.current = c;
                    }}
                  />
                </View>
                <Text style={styles.name}>{profile.name.trim() || 'Your card'}</Text>
                {mode === 'full' && (profile.title.trim() || profile.company.trim()) ? (
                  <Text style={styles.meta}>
                    {[profile.title.trim(), profile.company.trim()].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                <Text style={styles.hint}>
                  {mode === 'limited'
                    ? 'Limited: name, phone, and website only.'
                    : 'Full details (default): name, title, company, email, phone, and website.'}
                  {'\n'}
                  Share as a designed card, QR image, or contact text (vCard).
                </Text>
              </>
            )}
          </ScreenBody>

          {payload ? (
            <>
              <ExportCardCaptureHost cardRef={cardRef}>
                <ExportCard fields={exportFields} qrValue={payload} />
              </ExportCardCaptureHost>
              <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
                <PrimaryButton
                  label="Edit profile"
                  variant="tonal"
                  icon="person"
                  style={styles.flex}
                  disabled={busy}
                  onPress={() => router.push('/profile')}
                />
                <PrimaryButton
                  label="Share"
                  icon="ios_share"
                  style={styles.flex}
                  loading={busy}
                  onPress={onShareMenu}
                />
              </View>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { gap: spacing.sm, alignItems: 'center', paddingTop: spacing.md },
  intro: {
    ...type.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  qrCard: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  name: { ...type.title, color: colors.onSurface, textAlign: 'center' },
  meta: { ...type.bodySm, color: colors.onSurfaceVariant, textAlign: 'center' },
  hint: {
    ...type.label,
    color: colors.outline,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  flex: { flex: 1 },
  footer: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    ...shadows.raised,
  },
});
