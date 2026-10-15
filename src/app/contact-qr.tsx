import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
  encodeAsVCard,
  resolveQrDetailMode,
  type QrDetailMode,
} from '@/lib/qr-card';
import { shareQrPngBase64 } from '@/lib/qr-share';
import { paramString } from '@/lib/route-params';
import { getContact, type Contact } from '@/lib/storage';

type QrSvg = { toDataURL: (cb: (data: string) => void) => void };

export default function ContactQrScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = paramString(params.id);
  const insets = useSafeAreaInsets();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<QrDetailMode>('full');
  const [busy, setBusy] = useState(false);
  const qrRef = useRef<QrSvg | null>(null);
  const cardRef = useRef<ExportCardViewRef | null>(null);

  useEffect(() => {
    let alive = true;
    if (!id) {
      setContact(null);
      setLoading(false);
      return () => {
        alive = false;
      };
    }
    void getContact(id).then((found) => {
      if (!alive) return;
      setContact(found ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!contact) return;
    if (mode === 'limited' && !canUseLimitedQr(contact)) {
      setMode('full');
    }
  }, [contact, mode]);

  const effectiveMode = contact ? resolveQrDetailMode(contact, mode) : 'full';
  const payload =
    contact &&
    (contact.name.trim() ||
      contact.phone.trim() ||
      contact.email.trim() ||
      Boolean(contact.website?.trim()))
      ? encodeAsVCard(
          {
            name: contact.name,
            title: contact.title,
            company: contact.company,
            email: contact.email,
            phone: contact.phone,
            website: contact.website,
            address: contact.address,
            note: contact.note,
          },
          effectiveMode
        )
      : '';

  const exportFields = contact
    ? fieldsForExportCard(
        {
          name: contact.name,
          title: contact.title,
          company: contact.company,
          email: contact.email,
          phone: contact.phone,
          website: contact.website,
          address: contact.address,
        },
        effectiveMode
      )
    : null;

  function chooseLimited() {
    if (!contact || !canUseLimitedQr(contact)) {
      notify('Add a name or phone to use Limited QR.');
      return;
    }
    setMode('limited');
  }

  function onShareMenu() {
    if (!payload) return;
    Alert.alert('Share contact QR', 'Choose how to share.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Share card image', onPress: () => void shareCardImage() },
      { text: 'Share QR image', onPress: () => void shareImage() },
      { text: 'Share contact (vCard)', onPress: () => void shareVcard() },
    ]);
  }

  async function shareVcard() {
    try {
      await Share.share({
        message: payload,
        title: contact?.name || 'Contact',
      });
    } catch {
      notify('Could not open the share sheet.');
    }
  }

  async function shareCardImage() {
    setBusy(true);
    try {
      await shareExportCardImage(cardRef, 'cardflow-contact-card.png');
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
          void shareQrPngBase64(data, 'cardflow-contact-qr.png')
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
      <AppHeader title="Contact QR" eyebrow="SHARE" onBack={() => router.back()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !contact || !payload ? (
        <ScreenBody contentStyle={styles.content}>
          <Text style={styles.emptyTitle}>Nothing to encode</Text>
          <Text style={styles.emptyBody}>
            This contact needs a name, email, phone, or website before you can share a QR.
          </Text>
        </ScreenBody>
      ) : (
        <>
          <ScreenBody contentStyle={styles.content}>
            <Text style={styles.intro}>
              Scan to save this contact. Choose full or limited details before sharing.
            </Text>
            <View style={styles.modeRow}>
              <Chip label="Full details" selected={mode === 'full'} onPress={() => setMode('full')} />
              <Chip label="Limited" selected={mode === 'limited'} onPress={chooseLimited} />
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
            <Text style={styles.name}>{contact.name}</Text>
            <Text style={styles.hint}>
              {mode === 'limited'
                ? 'Limited: name, phone, and website only.'
                : 'Full details (default): all saved contact fields.'}
              {'\n'}
              Share as a designed card, QR image, or contact text (vCard).
            </Text>
          </ScreenBody>
          {exportFields ? (
            <ExportCardCaptureHost cardRef={cardRef}>
              <ExportCard fields={exportFields} qrValue={payload} />
            </ExportCardCaptureHost>
          ) : null}
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
            <PrimaryButton
              label="Share"
              icon="ios_share"
              loading={busy}
              onPress={onShareMenu}
              style={styles.flex}
            />
          </View>
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
  hint: { ...type.label, color: colors.outline, textAlign: 'center' },
  emptyTitle: { ...type.headline, color: colors.onSurface, textAlign: 'center' },
  emptyBody: { ...type.bodySm, color: colors.onSurfaceVariant, textAlign: 'center' },
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
