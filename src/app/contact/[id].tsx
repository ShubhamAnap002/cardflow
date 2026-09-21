import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Avatar } from '@/components/avatar';
import { Chip } from '@/components/chip';
import { Icon, type IconName } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { EmptyState } from '@/components/tiles';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { callNumber, openMap, openWebsite, sendEmail, shareContact } from '@/lib/actions';
import { confirm, notify } from '@/lib/feedback';
import {
  deleteContact,
  getContact,
  initialsOf,
  relativeDate,
  toggleFavorite,
  type Contact,
} from '@/lib/storage';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contact, setContact] = useState<Contact | undefined>();
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
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
    await toggleFavorite(contact.id);
    setContact({ ...contact, favorite: !contact.favorite });
  }

  function onDelete() {
    if (!contact) return;
    confirm('Delete contact?', `${contact.name} will be removed from this device.`, 'Delete', async () => {
      await deleteContact(contact.id);
      notify('Contact deleted.');
      router.back();
    });
  }

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Contact" onBack={() => router.back()} />
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

  const lowConfidence = (contact.confidence ?? 100) < 90;

  return (
    <Screen>
      <AppHeader title="Contact" eyebrow="CARDFLOW AI" onBack={() => router.back()} />

      <ScreenBody contentStyle={styles.content}>
        <View style={styles.hero}>
          <Avatar initials={initialsOf(contact.name)} size={72} seed={contact.id} rounded />
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.role}>
            {[contact.title, contact.company].filter(Boolean).join(' · ') || 'No title saved'}
          </Text>

          <View style={styles.badges}>
            {contact.group ? <Chip label={contact.group} icon="folder_shared" /> : null}
            {lowConfidence ? (
              <Chip label="Needs review" icon="error" tone="warning" />
            ) : contact.confidence != null ? (
              <Chip label={`${contact.confidence}% confident`} icon="verified" tone="success" />
            ) : (
              <Chip label="Saved on device" icon="check_circle" tone="success" />
            )}
          </View>

          <View style={styles.heroActions}>
            <PrimaryButton
              label="Call"
              icon="call"
              compact
              style={styles.flex}
              onPress={() => callNumber(contact.phone)}
            />
            <PrimaryButton
              label="Email"
              icon="mail"
              variant="tonal"
              compact
              style={styles.flex}
              onPress={() => sendEmail(contact.email)}
            />
            <PrimaryButton
              label="Share"
              icon="share"
              variant="ghost"
              compact
              style={styles.flex}
              onPress={() => shareContact(contact)}
            />
          </View>
        </View>

        {contact.cardUri ? (
          <Image source={{ uri: contact.cardUri }} style={styles.card} resizeMode="cover" />
        ) : null}

        <View style={styles.details}>
          {contact.phone ? (
            <Detail icon="call" label="Phone" value={contact.phone} onPress={() => callNumber(contact.phone)} />
          ) : null}
          {contact.email ? (
            <Detail icon="mail" label="Email" value={contact.email} onPress={() => sendEmail(contact.email)} />
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
  card: {
    width: '100%',
    aspectRatio: 1.7,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceHigh,
  },
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
