import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Avatar } from '@/components/avatar';
import { CardPair } from '@/components/card-pair';
import { Chip } from '@/components/chip';
import { Icon, type IconName } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { EmptyState } from '@/components/tiles';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { callNumber, openMap, openWebsite, sendEmail, shareContact } from '@/lib/actions';
import { confirm, notify } from '@/lib/feedback';
import { paramString } from '@/lib/route-params';
import {
  deleteContact,
  getContact,
  initialsOf,
  relativeDate,
  toggleFavorite,
  updateContact,
  type Contact,
} from '@/lib/storage';
import { syncLeadToEnerTechCrm } from '@/lib/crm';

function Detail({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.detail, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.detailIcon}>
        <Icon name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={3}>
          {value}
        </Text>
      </View>
      {onPress ? <Icon name="chevron_right" size={18} color={colors.outline} /> : null}
    </Pressable>
  );
}

export default function ContactDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = paramString(params.id);
  const [contact, setContact] = useState<Contact | undefined>();
  const [loading, setLoading] = useState(true);
  const [syncingCrm, setSyncingCrm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!id) {
        setContact(undefined);
        setLoading(false);
        return () => {
          active = false;
        };
      }
      void getContact(id).then((found) => {
        if (!active) return;
        setContact(found);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [id])
  );

  async function onToggleFavorite() {
    if (!contact) return;
    try {
      await toggleFavorite(contact.id);
      setContact({ ...contact, favorite: !contact.favorite });
    } catch {
      notify('Could not update favorite.');
    }
  }

  function onDelete() {
    if (!contact) return;
    confirm('Delete contact?', `${contact.name} will be removed from this device.`, 'Delete', async () => {
      try {
        await deleteContact(contact.id);
        notify('Contact deleted.');
        router.back();
      } catch {
        notify('Could not delete that contact.');
      }
    });
  }

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Contact" onBack={() => router.back()} />
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!contact) {
    return (
      <Screen>
        <AppHeader title="Contact" onBack={() => router.back()} />
        <ScreenBody>
          <EmptyState
            icon="error"
            title="Contact not found"
            body="It may have been deleted from this device."
          />
        </ScreenBody>
      </Screen>
    );
  }

  async function onManualCrmSync() {
    if (!contact) return;
    setSyncingCrm(true);
    try {
      const res = await syncLeadToEnerTechCrm(contact);
      if (res.ok && res.leadId) {
        await updateContact(contact.id, {
          crmLeadId: res.leadId,
          crmSyncStatus: 'synced',
        });
        setContact({ ...contact, crmLeadId: res.leadId, crmSyncStatus: 'synced' });
        notify('Synced to EnerTech CRM (Source: EXPO)!');
      } else {
        notify(`CRM Sync: ${res.error || 'Failed'}`);
      }
    } finally {
      setSyncingCrm(false);
    }
  }

  const lowConfidence = (contact.confidence ?? 100) < 90;

  return (
    <Screen>
      <AppHeader title="Contact" eyebrow="CARDFLOW" onBack={() => router.back()} />

      <ScreenBody contentStyle={styles.content}>
        <View style={styles.hero}>
          <Avatar initials={initialsOf(contact.name)} size={72} seed={contact.id} rounded />
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.role}>
            {[contact.title, contact.company].filter(Boolean).join(' · ') || 'No title saved'}
          </Text>

          <View style={styles.badges}>
            {contact.leadLevel ? (
              <Chip label={contact.leadLevel} icon="workspace_premium" tone="success" />
            ) : null}
            {contact.leadType ? (
              <Chip label={contact.leadType} icon="language" tone="neutral" />
            ) : null}
            {contact.scope ? (
              <Chip label={`Scope: ${contact.scope}`} icon="style" tone="neutral" />
            ) : null}
            {contact.crmSyncStatus === 'synced' ? (
              <Chip label="✓ EnerTech CRM" icon="cloud_done" tone="success" />
            ) : (
              <Chip
                label={syncingCrm ? 'Syncing...' : 'Sync to CRM'}
                icon="cloud_upload"
                tone="warning"
                onPress={onManualCrmSync}
              />
            )}
            {contact.group ? <Chip label={contact.group} icon="folder_shared" /> : null}
            {lowConfidence ? (
              <Chip label="Needs review" icon="error" tone="warning" />
            ) : contact.source === 'qr' ? (
              <Chip label="From QR" icon="qr_code_2" tone="neutral" />
            ) : contact.confidence != null ? (
              <Chip label={`${contact.confidence}% confident`} icon="verified" tone="neutral" />
            ) : null}
          </View>

          <View style={styles.heroActions}>
            <PrimaryButton
              label="Call"
              icon="call"
              compact
              style={styles.flex}
              disabled={!contact.phone?.trim()}
              onPress={() => callNumber(contact.phone)}
            />
            <PrimaryButton
              label="Email"
              icon="mail"
              variant="tonal"
              compact
              style={styles.flex}
              disabled={!contact.email?.trim()}
              onPress={() => sendEmail(contact.email)}
            />
            <PrimaryButton
              label="Share text"
              icon="share"
              variant="ghost"
              compact
              style={styles.flex}
              onPress={() => shareContact(contact)}
            />
          </View>
        </View>

        <CardPair frontUri={contact.cardUri} backUri={contact.cardUriBack} />

        <View style={styles.details}>
          {contact.phone ? (
            <Detail icon="call" label="Mobile (Primary)" value={contact.phone} onPress={() => callNumber(contact.phone)} />
          ) : null}
          {contact.phone2 ? (
            <Detail icon="call" label="Mobile 2 (Secondary)" value={contact.phone2} onPress={() => callNumber(contact.phone2)} />
          ) : null}
          {contact.email ? (
            <Detail icon="mail" label="Email (Primary)" value={contact.email} onPress={() => sendEmail(contact.email)} />
          ) : null}
          {contact.email2 ? (
            <Detail icon="mail" label="Email 2 (Secondary)" value={contact.email2} onPress={() => sendEmail(contact.email2)} />
          ) : null}
          {contact.products && contact.products.length > 0 ? (
            <Detail icon="shopping_bag" label="Products Interested" value={contact.products.join(', ')} />
          ) : null}
          {contact.remark ? (
            <Detail icon="comment" label="Remarks" value={contact.remark} />
          ) : null}
          {contact.voiceTranscript && contact.voiceTranscript !== contact.remark ? (
            <Detail icon="record_voice_over" label="Voice Transcript" value={contact.voiceTranscript} />
          ) : null}
          {contact.website ? (
            <Detail
              icon="language"
              label="Website"
              value={contact.website}
              onPress={() => openWebsite(contact.website)}
            />
          ) : null}
          {contact.address ? (
            <Detail
              icon="location_on"
              label="Address"
              value={contact.address}
              onPress={() => openMap(contact.address)}
            />
          ) : null}
          {contact.note ? <Detail icon="edit_note" label="Note" value={contact.note} /> : null}
          <Detail icon="schedule" label="Added" value={relativeDate(contact.createdAt)} />
        </View>

        <View style={styles.footerActions}>
          <PrimaryButton
            label="Show QR"
            icon="qr_code_2"
            variant="tonal"
            onPress={() => router.push(`/contact-qr?id=${contact.id}`)}
          />
          <PrimaryButton
            label={contact.favorite ? 'Remove favorite' : 'Add to favorites'}
            icon={contact.favorite ? 'star' : 'star_border'}
            variant="tonal"
            onPress={onToggleFavorite}
          />
          <PrimaryButton
            label="Edit details"
            icon="edit"
            variant="ghost"
            onPress={() => router.push(`/edit?id=${contact.id}`)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete contact"
            onPress={onDelete}
            style={({ pressed }) => [styles.delete, pressed && styles.deletePressed]}
          >
            <Icon name="delete" size={18} color={colors.error} />
            <Text style={styles.deleteText}>Delete contact</Text>
          </Pressable>
        </View>
      </ScreenBody>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  pressed: { backgroundColor: colors.surfaceLow },
  hero: {
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    padding: spacing.md,
    ...shadows.card,
  },
  name: { ...type.headline, color: colors.onSurface, marginTop: spacing.xs, textAlign: 'center' },
  role: { ...type.body, color: colors.onSurfaceVariant, textAlign: 'center' },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  heroActions: { flexDirection: 'row', gap: spacing.xs, alignSelf: 'stretch', marginTop: spacing.sm },
  details: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.sm,
    ...shadows.card,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCopy: { flex: 1, minWidth: 0, gap: 1 },
  detailLabel: { ...type.label, color: colors.onSurfaceVariant },
  detailValue: { ...type.body, color: colors.onSurface, fontWeight: '500' },
  footerActions: { gap: spacing.xs },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.errorSoft,
  },
  deletePressed: { opacity: 0.8 },
  deleteText: { ...type.labelLg, color: colors.error, fontWeight: '700' },
});
