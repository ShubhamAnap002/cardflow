import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { CardPair } from '@/components/card-pair';
import { Chip } from '@/components/chip';
import {
  ContactForm,
  EMPTY_DRAFT,
  toContact,
  validate,
  type Draft,
  type DraftErrors,
} from '@/components/contact-form';
import { Icon } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { colors, shadows, spacing, type } from '@/constants/theme';
import { maybeShowInterstitial } from '@/lib/ads';
import { isQuotaExceeded } from '@/lib/entitlements';
import { notify } from '@/lib/feedback';
import { persistCardImage } from '@/lib/media';
import { averageConfidence, mergeCardFields } from '@/lib/merge-card';
import { dismissToHome } from '@/lib/navigation';
import { draftFromOcr, scanCardImage } from '@/lib/ocr';
import { paramString } from '@/lib/route-params';
import { offerQuotaOptions } from '@/lib/scan-paywall';
import { addContact, loadSettings, updateContact } from '@/lib/storage';
import { useCardflow } from '@/lib/use-cardflow';
import {
  queuePendingCrmSync,
  removePendingCrmSync,
  syncLeadToEnerTechCrm,
} from '@/lib/crm';

const STEPS = ['Reading the card', 'Extracting details', 'Opening the form'];

const PICKER: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.85,
  allowsEditing: true,
  exif: false,
};

export default function ReviewScreen() {
  const { uri: uriParam, source: sourceParam } = useLocalSearchParams<{
    uri?: string | string[];
    source?: string | string[];
  }>();
  const uri = paramString(uriParam);
  const fromQr = paramString(sourceParam) === 'qr';
  const { groups } = useCardflow();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [confidence, setConfidence] = useState<number | undefined>();
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const [backBusy, setBackBusy] = useState(false);
  const [backUri, setBackUri] = useState<string | undefined>();
  const ranForUri = useRef<string | undefined>(undefined);
  const qrApplied = useRef(false);

  // Clear staged QR PII on any leave (header back, Android back, replace after save).
  useEffect(() => {
    if (!fromQr) return;
    const unsub = navigation.addListener('beforeRemove', () => {
      void import('@/lib/qr-card').then(({ clearQrDraft }) => clearQrDraft());
    });
    return unsub;
  }, [fromQr, navigation]);

  useEffect(() => {
    if (fromQr) {
      let cancelled = false;
      (async () => {
        try {
          const {
            readQrDraft,
            isQrDraftAppliedInReview,
            markQrDraftAppliedInReview,
          } = await import('@/lib/qr-card');

          // Module flag survives Strict Mode remount; component ref alone does not.
          if (qrApplied.current || isQrDraftAppliedInReview()) {
            const staged = await readQrDraft();
            if (!cancelled && staged && !qrApplied.current) {
              setDraft(staged);
              qrApplied.current = true;
            }
            if (!cancelled) setReady(true);
            return;
          }

          setReady(false);
          const staged = await readQrDraft();
          if (cancelled) return;

          if (staged) {
            setDraft(staged);
            qrApplied.current = true;
            markQrDraftAppliedInReview();
            // Keep draft in memory/storage until save or abandon (remount-safe).
            if (!staged.name && !staged.email && !staged.phone && !staged.website) {
              notify('Fill in the contact details from this QR.');
            }
          } else {
            setDraft(EMPTY_DRAFT);
            qrApplied.current = true;
            markQrDraftAppliedInReview();
            notify('No QR data found. Enter the contact manually.');
          }
        } catch {
          if (!cancelled && !qrApplied.current) {
            setDraft(EMPTY_DRAFT);
            qrApplied.current = true;
            notify('Could not load QR data. Enter details manually.');
          }
        } finally {
          if (!cancelled) setReady(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (!uri) {
      setReady(true);
      notify('No photo found. Enter the contact manually.');
      return;
    }

    if (ranForUri.current === uri) return;
    ranForUri.current = uri;

    let cancelled = false;

    (async () => {
      setStep(0);
      setReady(false);
      try {
        setStep(1);
        const result = await scanCardImage(uri);
        if (cancelled) return;
        setStep(2);
        setDraft(draftFromOcr(result.fields, result.rawLines, result.extra));
        setConfidence(result.confidence);
        if (!result.fields.name && !result.fields.email && !result.fields.phone) {
          notify('Could not read much from the card — fill in the blanks.');
        }
      } catch (error) {
        if (cancelled) return;
        if (isQuotaExceeded(error)) {
          const unlocked = await offerQuotaOptions();
          if (unlocked && !cancelled) {
            try {
              setStep(1);
              const result = await scanCardImage(uri);
              if (cancelled) return;
              setStep(2);
              setDraft(draftFromOcr(result.fields, result.rawLines, result.extra));
              setConfidence(result.confidence);
              return;
            } catch (retryError) {
              if (cancelled) return;
              notify(
                retryError instanceof Error
                  ? retryError.message
                  : 'OCR failed. Enter details manually.'
              );
              setDraft(EMPTY_DRAFT);
              setConfidence(undefined);
              return;
            }
          }
          notify('Scan limit reached. Upgrade or watch an ad for more scans.');
          setDraft(EMPTY_DRAFT);
          setConfidence(undefined);
          return;
        }
        const message =
          error instanceof Error ? error.message : 'OCR failed. Enter details manually.';
        notify(message);
        setDraft(EMPTY_DRAFT);
        setConfidence(undefined);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri, fromQr]);

  function change(key: keyof Draft, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  async function scanBackSide() {
    if (backBusy) return;
    setBackBusy(true);
    let stored: string | undefined;
    try {
      let result;
      if (Platform.OS === 'web') {
        result = await ImagePicker.launchImageLibraryAsync(PICKER);
      } else {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          notify('Allow camera access to scan the back of the card.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(PICKER);
      }
      const picked = result.canceled ? undefined : result.assets?.[0]?.uri;
      if (!picked) return;

      stored = picked;
      try {
        stored = await persistCardImage(picked);
      } catch {
        // keep picker uri
      }

      const ocr = await scanCardImage(stored);
      setBackUri(stored);
      setDraft((prev) => {
        const merged = mergeCardFields(prev, ocr.fields);
        const combinedLines = Array.from(
          new Set([...(prev.rawOcrLines || []), ...(ocr.rawLines || [])])
        );
        return {
          ...merged,
          phone2: prev.phone2 || ocr.extra?.phone2 || '',
          email2: prev.email2 || ocr.extra?.email2 || '',
          products: Array.from(new Set([...(prev.products || []), ...(ocr.extra?.products || [])])),
          rawOcrLines: combinedLines,
        };
      });
      setConfidence((prev) => averageConfidence(prev, ocr.confidence));
      notify('Back side merged — check the fields.');
    } catch (error) {
      if (isQuotaExceeded(error) && stored) {
        const unlocked = await offerQuotaOptions();
        if (unlocked) {
          try {
            const ocr = await scanCardImage(stored);
            setBackUri(stored);
            setDraft((prev) => {
              const merged = mergeCardFields(prev, ocr.fields);
              const combinedLines = Array.from(
                new Set([...(prev.rawOcrLines || []), ...(ocr.rawLines || [])])
              );
              return {
                ...merged,
                phone2: prev.phone2 || ocr.extra?.phone2 || '',
                email2: prev.email2 || ocr.extra?.email2 || '',
                products: Array.from(new Set([...(prev.products || []), ...(ocr.extra?.products || [])])),
                rawOcrLines: combinedLines,
              };
            });
            setConfidence((prev) => averageConfidence(prev, ocr.confidence));
            notify('Back side merged — check the fields.');
            return;
          } catch (retryError) {
            notify(
              retryError instanceof Error
                ? retryError.message
                : 'Could not scan the back side.'
            );
            return;
          }
        }
        notify('Scan limit reached. Upgrade or watch an ad for more scans.');
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Could not scan the back side.';
      notify(message);
    } finally {
      setBackBusy(false);
    }
  }

  async function save(andScanAnother: boolean) {
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      notify('Check the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const settings = await loadSettings();
      let cardUri: string | undefined;
      let cardUriBack: string | undefined;
      if (uri && settings.saveCardImages) {
        try {
          cardUri = await persistCardImage(uri);
        } catch {
          cardUri = uri;
        }
      }
      if (backUri && settings.saveCardImages) {
        try {
          cardUriBack = await persistCardImage(backUri);
        } catch {
          cardUriBack = backUri;
        }
      }

      const contact = await addContact(
        toContact(draft, {
          cardUri,
          cardUriBack,
          confidence,
          source: fromQr ? 'qr' : uri ? 'scan' : undefined,
        })
      );
      if (fromQr) {
        const { clearQrDraft } = await import('@/lib/qr-card');
        await clearQrDraft();
      }

      // Automatically sync lead to EnerTech CRM (source: EXPO)
      void (async () => {
        try {
          const syncRes = await syncLeadToEnerTechCrm(contact);
          if (syncRes.ok && syncRes.leadId) {
            await updateContact(contact.id, {
              crmLeadId: syncRes.leadId,
              crmSyncStatus: 'synced',
            });
            await removePendingCrmSync(contact.id);
          } else {
            await updateContact(contact.id, {
              crmSyncStatus: 'pending',
              crmSyncError: syncRes.error,
            });
            await queuePendingCrmSync(contact.id);
          }
        } catch {
          await queuePendingCrmSync(contact.id);
        }
      })();

      notify(`${contact.name} saved & synced to EnerTech CRM!`);
      // QR saves do not use OCR quota; skip interstitial so the loop stays fast.
      if (!fromQr) void maybeShowInterstitial();
      if (andScanAnother) router.replace(fromQr ? '/scan-qr' : '/scan');
      else router.replace(`/contact/${contact.id}`);
    } catch {
      notify('Could not save that contact. Please try again.');
      setSaving(false);
    }
  }

  const confidenceTone =
    confidence == null ? null : confidence >= 90 ? 'success' : confidence >= 70 ? 'neutral' : 'warning';

  return (
    <Screen>
      <AppHeader
        title={ready ? (fromQr ? 'Review QR contact' : 'Review card') : fromQr ? 'Loading' : 'Scanning'}
        eyebrow="NEW CONTACT"
        onBack={() => {
          if (fromQr) {
            void import('@/lib/qr-card').then(({ clearQrDraft }) => clearQrDraft());
          }
          dismissToHome();
        }}
      />

      {ready ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScreenBody contentStyle={styles.reviewContent}>
            {!fromQr ? <CardPair frontUri={uri} backUri={backUri} /> : null}

            {fromQr ? (
              <View style={styles.metaRow}>
                <Chip label="From QR" icon="qr_code_2" tone="neutral" />
              </View>
            ) : (
              <View style={styles.metaRow}>
                {confidenceTone && confidence != null ? (
                  <Chip
                    label={`${confidence}% confident`}
                    icon={confidence >= 90 ? 'verified' : 'info'}
                    tone={confidenceTone}
                  />
                ) : null}
                {backUri ? <Chip label="2 sides" icon="swap_vert" tone="neutral" /> : null}
              </View>
            )}

            {!fromQr ? (
              <PrimaryButton
                label={backUri ? 'Rescan back side' : 'Scan back side'}
                variant="tonal"
                icon="swap_vert"
                loading={backBusy}
                disabled={saving}
                onPress={scanBackSide}
              />
            ) : null}

            <ContactForm
              draft={draft}
              errors={errors}
              groups={groups}
              onChange={change}
              detectedLines={draft.rawOcrLines}
            />
          </ScreenBody>

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
            <PrimaryButton
              label={fromQr ? 'Save & scan QR' : 'Save & scan next'}
              variant="tonal"
              icon={fromQr ? 'qr_code_2' : 'add_a_photo'}
              disabled={saving || backBusy}
              style={styles.flex}
              onPress={() => save(true)}
            />
            <PrimaryButton
              label="Save contact"
              icon="done"
              loading={saving}
              disabled={backBusy}
              style={styles.flex}
              onPress={() => save(false)}
            />
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.processing}>
          {uri && !fromQr ? <CardPair frontUri={uri} style={styles.processingPreview} /> : null}
          <ActivityIndicator color={colors.primary} />
          {!fromQr ? (
            <View style={styles.steps}>
              {STEPS.map((label, index) => (
                <View key={label} style={styles.step}>
                  <Icon
                    name={index < step ? 'check_circle' : 'hourglass_empty'}
                    size={17}
                    color={index < step ? colors.tertiary : colors.outlineVariant}
                  />
                  <Text style={[styles.stepText, index < step && styles.stepDone]}>{label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.stepText}>Opening contact form…</Text>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  reviewContent: { gap: spacing.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
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
  processing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  processingPreview: { alignSelf: 'stretch' },
  steps: { gap: spacing.xs, alignSelf: 'stretch' },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepText: { ...type.body, color: colors.onSurfaceVariant },
  stepDone: { color: colors.onSurface, fontWeight: '600' },
});
