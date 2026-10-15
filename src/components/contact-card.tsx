import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icon';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { initialsOf, type Contact } from '@/lib/storage';

type Props = {
  contact: Contact;
  onPress?: () => void;
  onCall?: () => void;
  onEmail?: () => void;
  onToggleFavorite?: () => void;
};

export function ContactCard({ contact, onPress, onCall, onEmail, onToggleFavorite }: Props) {
  const lowConfidence = contact.confidence != null && contact.confidence < 90;
  const fromQr = contact.source === 'qr';
  const fromScan = contact.source === 'scan' || Boolean(contact.cardUri);
  const status = lowConfidence
    ? ({ icon: 'error' as const, text: 'Needs review', warn: true })
    : fromQr
      ? ({ icon: 'qr_code_2' as const, text: 'From QR', warn: false })
      : fromScan
        ? ({ icon: 'document_scanner' as const, text: 'From scan', warn: false })
        : ({ icon: 'check_circle' as const, text: 'On device', warn: false });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${contact.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <Avatar initials={initialsOf(contact.name)} size={46} seed={contact.id} rounded />
        <View style={styles.copy}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {contact.name}
            </Text>
            {contact.favorite ? <Icon name="star" size={16} color={colors.favorite} /> : null}
          </View>
          <Text style={styles.role} numberOfLines={1}>
            {[contact.title, contact.company].filter(Boolean).join(' • ')}
          </Text>
          <View style={styles.metaRow}>
            {contact.group ? (
              <Text style={styles.group} numberOfLines={1}>
                {contact.group}
              </Text>
            ) : null}
            <View style={status.warn ? styles.warn : styles.ok}>
              <Icon
                name={status.icon}
                size={12}
                color={status.warn ? colors.onErrorSoft : colors.tertiary}
              />
              <Text style={status.warn ? styles.warnText : styles.okText}>{status.text}</Text>
            </View>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={contact.favorite ? 'Remove favorite' : 'Add favorite'}
          hitSlop={10}
          onPress={onToggleFavorite}
          style={styles.favBtn}
        >
          <Icon
            name={contact.favorite ? 'star' : 'star_border'}
            size={20}
            color={contact.favorite ? colors.favorite : colors.outline}
          />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Action icon="call" label="Call" onPress={onCall} disabled={!contact.phone} />
        <Action icon="mail" label="Email" onPress={onEmail} disabled={!contact.email} />
        <Action icon="chevron_right" label="Details" onPress={onPress} />
      </View>
    </Pressable>
  );
}

function Action({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'call' | 'mail' | 'chevron_right';
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        pressed && styles.actionPressed,
        disabled && styles.actionDisabled,
      ]}
    >
      <Icon name={icon} size={17} color={colors.primary} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderLeftWidth: 3,
    borderLeftColor: colors.tertiaryFixed,
    padding: spacing.sm,
    gap: spacing.sm,
    ...shadows.card,
  },
  pressed: { backgroundColor: colors.surfaceLow },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  name: { ...type.labelLg, color: colors.onSurface, fontWeight: '700', flexShrink: 1 },
  role: { ...type.bodySm, color: colors.onSurfaceVariant },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 3 },
  group: { ...type.label, color: colors.primary, flexShrink: 1 },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  okText: { ...type.label, color: colors.tertiary },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  warnText: { ...type.label, color: colors.onErrorSoft },
  favBtn: { padding: 2 },
  actions: { flexDirection: 'row', gap: spacing.xs },
  action: {
    flex: 1,
    minHeight: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceLow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  actionPressed: { backgroundColor: colors.surfaceContainer },
  actionDisabled: { opacity: 0.45 },
  actionText: { ...type.label, color: colors.primary },
});
