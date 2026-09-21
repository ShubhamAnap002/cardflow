import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Avatar } from '@/components/avatar';
import { Icon, type IconName } from '@/components/icon';
import { Screen, ScreenBody } from '@/components/screen';
import { Section } from '@/components/section';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { exportContacts, shareProfile } from '@/lib/actions';
import { confirm, notify } from '@/lib/feedback';
import {
  DEFAULT_SETTINGS,
  initialsOf,
  loadSettings,
  resetDemoData,
  saveSettings,
  type Settings,
} from '@/lib/storage';
import { useCardflow } from '@/lib/use-cardflow';

const TOGGLES: { key: keyof Settings; label: string; hint: string; icon: IconName }[] = [
  {
    key: 'autoEnhance',
    label: 'Auto-enhance captures',
    hint: 'Straighten and sharpen each card after capture.',
    icon: 'auto_awesome',
  },
  {
    key: 'detectDuplicates',
    label: 'Duplicate detection',
    hint: 'Warn before saving someone you already have.',
    icon: 'done_all',
  },
  {
    key: 'saveCardImages',
    label: 'Keep card photos',
    hint: 'Store the original image alongside each contact.',
    icon: 'image',
  },
  {
    key: 'wifiOnlySync',
    label: 'Sync on Wi-Fi only',
    hint: 'Hold uploads until you are off mobile data.',
    icon: 'cloud_sync',
  },
];

function Row({
  icon,
  label,
  hint,
  tint = colors.primary,
  onPress,
  destructive,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  tint?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${tint}1A` }]}>
        <Icon name={icon} size={19} color={tint} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, destructive && { color: colors.error }]}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Icon name="chevron_right" size={20} color={colors.outline} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { profile, contacts, reload } = useCardflow();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    void loadSettings().then((stored) => {
      if (active) setSettings(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  function toggle(key: keyof Settings) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    void saveSettings(next);
  }

  function onReset() {
    confirm(
      'Reset CardFlow data?',
      'Your contacts, groups and profile on this device are deleted and the demo set comes back.',
      'Reset',
      async () => {
        await resetDemoData();
        await reload();
        setSettings(DEFAULT_SETTINGS);
        notify('CardFlow has been reset.');
      }
    );
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <AppHeader title="Settings" />

      <ScreenBody tabBar>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit your profile"
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [styles.profile, pressed && styles.rowPressed]}
        >
          <Avatar
            initials={initialsOf(profile.name)}
            uri={profile.avatarUri}
            size={54}
            seed="me"
            rounded
          />
          <View style={styles.rowCopy}>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile.name}
            </Text>
            <Text style={styles.profileMeta} numberOfLines={1}>
              {[profile.title, profile.company].filter(Boolean).join(' · ')}
            </Text>
            <Text style={styles.profileEdit}>Edit your shareable card</Text>
          </View>
          <Icon name="edit" size={20} color={colors.primary} />
        </Pressable>

        <Section title="Scanning">
          <View style={styles.card}>
            {TOGGLES.map((item, index) => (
              <View
                key={item.key}
                style={[styles.toggle, index > 0 && styles.divided]}
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
                  <Icon name={item.icon} size={19} color={colors.primary} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowHint}>{item.hint}</Text>
                </View>
                <Switch
                  value={settings[item.key]}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{ false: colors.outlineVariant, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            ))}
          </View>
        </Section>

        <Section title="Data">
          <Row
            icon="folder_shared"
            label="Manage groups"
            hint="Create, browse and delete groups."
            onPress={() => router.navigate('/groups')}
          />
          <Row
            icon="file_upload"
            label="Export contacts"
            hint={`Share all ${contacts.length} contacts as CSV.`}
            tint={colors.secondary}
            onPress={() => exportContacts(contacts)}
          />
          <Row
            icon="share"
            label="Share my card"
            hint="Send your own details to someone."
            tint={colors.tertiary}
            onPress={() => shareProfile(profile)}
          />
        </Section>

        <Section title="About">
          <Row
            icon="lock"
            label="Privacy"
            hint="Everything is stored locally on this device."
            tint={colors.tertiary}
            onPress={() =>
              notify('CardFlow keeps contacts, groups and card photos on this device only.')
            }
          />
          <Row
            icon="delete"
            label="Reset app data"
            hint="Clear everything and restore the demo set."
            tint={colors.error}
            destructive
            onPress={onReset}
          />
          <Text style={styles.version}>CardFlow {version}</Text>
        </Section>
      </ScreenBody>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.sm,
    ...shadows.card,
  },
  profileName: { ...type.title, color: colors.onSurface },
  profileMeta: { ...type.bodySm, color: colors.onSurfaceVariant },
  profileEdit: { ...type.label, color: colors.primary, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.sm,
    ...shadows.card,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  divided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    ...shadows.card,
  },
  rowPressed: { backgroundColor: colors.surfaceLow },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, minWidth: 0, gap: 1 },
  rowLabel: { ...type.labelLg, color: colors.onSurface, fontWeight: '600' },
  rowHint: { ...type.bodySm, color: colors.onSurfaceVariant },
  version: { ...type.label, color: colors.outline, textAlign: 'center', marginTop: spacing.xxs },
});
