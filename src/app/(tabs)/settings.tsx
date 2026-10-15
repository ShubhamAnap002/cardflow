import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Avatar } from '@/components/avatar';
import { Icon, type IconName } from '@/components/icon';
import { Screen, ScreenBody } from '@/components/screen';
import { Section } from '@/components/section';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { exportContacts } from '@/lib/actions';
import {
  FREE_SCAN_LIMIT,
  getEntitlementState,
  isPro,
  openManageSubscriptions,
  purchasePro,
  restorePurchases,
  type EntitlementState,
  type ProPeriod,
} from '@/lib/entitlements';
import { confirm, notify } from '@/lib/feedback';
import { useAuth } from '@/lib/auth-context';
import { clearLocalUserContent, deleteAccountAndLocalData } from '@/lib/consent';
import { SUPPORT_EMAIL } from '@/lib/legal-content';
import { initialsOf, loadSettings, saveSettings } from '@/lib/storage';
import { useCardflow } from '@/lib/use-cardflow';

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
  const { user, signOut, refreshProfile, configured, profile: remoteProfile } = useAuth();
  const [entitlement, setEntitlement] = useState<EntitlementState | null>(null);
  const [saveCardImages, setSaveCardImages] = useState(true);

  const refreshEntitlement = useCallback(() => {
    void (async () => {
      try {
        // Logged in but profile not loaded (offline/transient) — never revoke local Pro.
        if (configured && user && !remoteProfile) {
          setEntitlement(await getEntitlementState());
          return;
        }
        const { syncSubscriptionStatus } = await import('@/lib/billing');
        await syncSubscriptionStatus({
          keepRemotePro:
            remoteProfile?.plan === 'pro' &&
            (remoteProfile.pro_source === 'admin' || remoteProfile.pro_source === 'promo'),
        });
      } catch {
        // keep local state
      }
      setEntitlement(await getEntitlementState());
    })();
  }, [configured, user, remoteProfile]);

  useEffect(() => {
    refreshEntitlement();
  }, [refreshEntitlement]);

  useEffect(() => {
    void loadSettings().then((s) => setSaveCardImages(s.saveCardImages));
  }, []);

  async function onToggleSaveImages(next: boolean) {
    const previous = saveCardImages;
    setSaveCardImages(next);
    try {
      await saveSettings({ saveCardImages: next });
    } catch {
      setSaveCardImages(previous);
      notify('Could not save that setting.');
    }
  }
  function buyPeriod(period: ProPeriod) {
    void (async () => {
      try {
        await purchasePro(period);
        refreshEntitlement();
        void refreshProfile();
        notify(period === 'yearly' ? 'Pro yearly started. Thank you!' : 'Pro monthly started. Thank you!');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not complete purchase.';
        if (!/cancelled/i.test(message)) notify(message);
      }
    })();
  }

  function onUpgrade() {
    Alert.alert(
      'Upgrade to CardFlow Pro',
      'Unlimited scans, no ads, Excel export, cloud assist when needed. Billed via Google Play.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Monthly', onPress: () => buyPeriod('monthly') },
        { text: 'Yearly', onPress: () => buyPeriod('yearly') },
      ]
    );
  }

  function onManage() {
    Alert.alert(
      'Manage Pro',
      'Change or cancel your plan in Google Play. You can also restore an existing subscription on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: () => {
            void (async () => {
              try {
                const ok = await restorePurchases();
                refreshEntitlement();
                void refreshProfile();
                notify(ok ? 'Subscription restored.' : 'No active Pro subscription found.');
              } catch {
                notify('Could not restore subscription.');
              }
            })();
          },
        },
        {
          text: 'Open Google Play',
          onPress: () => {
            void (async () => {
              try {
                await openManageSubscriptions();
              } catch {
                notify('Could not open Google Play subscriptions.');
              }
            })();
          },
        },
      ]
    );
  }

  async function onExportExcel() {
    if (!(await isPro())) {
      notify('Excel export is a Pro feature.');
      onUpgrade();
      return;
    }
    await exportContacts(contacts);
  }

  function onClearLocal() {
    confirm(
      'Clear local data?',
      'Contacts, groups, and profile on this device will be deleted. Your account and Pro plan (if any) stay.',
      'Clear',
      async () => {
        await clearLocalUserContent();
        await reload();
        refreshEntitlement();
        notify('Local data cleared.');
      }
    );
  }

  async function onContactSupport() {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('CardFlow support')}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        notify(`Email us at ${SUPPORT_EMAIL}`);
        return;
      }
      await Linking.openURL(url);
    } catch {
      notify(`Email us at ${SUPPORT_EMAIL}`);
    }
  }

  function onDeleteAccount() {
    confirm(
      'Delete account?',
      'This permanently deletes your CardFlow account and clears data on this device. This cannot be undone.',
      'Delete',
      async () => {
        try {
          await deleteAccountAndLocalData();
          await reload();
          notify('Account deleted.');
          router.replace('/(auth)/login');
        } catch (error) {
          notify(error instanceof Error ? error.message : 'Could not delete account.');
        }
      }
    );
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const isProPlan = Boolean(entitlement?.isPro);
  const periodLabel =
    entitlement?.period === 'yearly'
      ? 'Yearly'
      : entitlement?.period === 'monthly'
        ? 'Monthly'
        : null;
  const activePlan = isProPlan ? (periodLabel ? `Pro · ${periodLabel}` : 'Pro') : 'Free';
  const planHint = isProPlan
    ? 'Active · Unlimited scans · No ads'
    : `Active · ${entitlement?.usage.count ?? 0}/${entitlement?.limit ?? FREE_SCAN_LIMIT} scans this month`;
  const displayName = profile.name.trim() || 'Your profile';
  const displayMeta =
    [profile.title, profile.company].filter(Boolean).join(' · ') || 'Tap to edit';

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
              {displayName}
            </Text>
            <Text style={styles.profileMeta} numberOfLines={1}>
              {displayMeta}
            </Text>
            <Text style={styles.profileEdit}>Edit profile</Text>
          </View>
          <Icon name="edit" size={20} color={colors.primary} />
        </Pressable>

        <Section title="My plan">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isProPlan ? 'Manage Pro plan' : 'Upgrade to Pro'}
            onPress={isProPlan ? onManage : onUpgrade}
            style={({ pressed }) => [styles.planCard, pressed && styles.rowPressed]}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.secondarySoft }]}>
              <Icon name="workspace_premium" size={19} color={colors.secondary} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>{activePlan} plan</Text>
              <Text style={styles.rowHint}>{planHint}</Text>
            </View>
            <Text style={styles.upgrade}>{isProPlan ? 'Manage' : 'Upgrade'}</Text>
          </Pressable>
        </Section>

        <Section title="Actions">
          <Row
            icon="folder_shared"
            label="Manage groups"
            onPress={() => router.navigate('/groups')}
          />
          <Row
            icon="file_upload"
            label="Export Excel"
            hint={isProPlan ? 'Backup contacts from this phone' : 'Pro only · backup contacts'}
            tint={colors.secondary}
            onPress={() => void onExportExcel()}
          />
          <Row
            icon="qr_code_2"
            label="My QR code"
            hint="Show QR or share as contact"
            tint={colors.tertiary}
            onPress={() => router.push('/my-qr')}
          />
        </Section>

        <Section title="Admin & Catalog">
          <Row
            icon="shopping_bag"
            label="Product & Category Management"
            hint="Add or edit products and categories for expo tagging"
            tint={colors.primary}
            onPress={() => router.push('/admin/products')}
          />
          <Row
            icon="cloud_upload"
            label="EnerTech Engage CRM"
            hint="API connectivity, source: EXPO & offline queue"
            tint={colors.tertiary}
            onPress={() => router.push('/admin/crm')}
          />
        </Section>

        <Section title="Your data">
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}1A` }]}>
              <Icon name="smartphone" size={19} color={colors.primary} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>Contacts stay on this phone</Text>
              <Text style={styles.rowHint}>
                CardFlow does not sync your address book to the cloud. Export Excel if you need a
                backup.
              </Text>
            </View>
          </View>
        </Section>

        <Section title="Scanning">
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: `${colors.tertiary}1A` }]}>
              <Icon name="image" size={19} color={colors.tertiary} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>Save card photos</Text>
              <Text style={styles.rowHint}>Keep front/back images with each contact</Text>
            </View>
            <Switch
              accessibilityLabel="Save card photos"
              value={saveCardImages}
              onValueChange={(v) => void onToggleSaveImages(v)}
              trackColor={{ false: colors.outlineVariant, true: colors.primarySoft }}
              thumbColor={saveCardImages ? colors.primary : colors.outline}
            />
          </View>
        </Section>

        <Section title="Privacy">
          <Row icon="lock" label="Privacy policy" onPress={() => router.push('/privacy')} />
          <Row
            icon="edit_note"
            label="Terms of Service"
            onPress={() => router.push('/terms')}
          />
          <Row
            icon="mail"
            label="Contact support"
            hint={SUPPORT_EMAIL}
            onPress={() => void onContactSupport()}
          />
          <Row
            icon="delete"
            label="Clear local data"
            hint="Contacts & profile on this device"
            tint={colors.error}
            destructive
            onPress={onClearLocal}
          />
          {configured && user ? (
            <>
              <Row
                icon="logout"
                label="Sign out"
                hint={user.email ?? undefined}
                onPress={() => {
                  confirm(
                    'Sign out?',
                    'Your contacts, groups, and profile on this phone will be deleted. Local Pro status and scan limits on this device are also cleared. Your account stays — sign in again anytime.',
                    'Sign out',
                    async () => {
                      await signOut();
                      notify('Signed out.');
                    }
                  );
                }}
              />
              <Row
                icon="person"
                label="Delete account"
                hint="Removes account + local data"
                tint={colors.error}
                destructive
                onPress={onDeleteAccount}
              />
            </>
          ) : null}
        </Section>

        <Text style={styles.version}>CardFlow {version}</Text>
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
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderLeftWidth: 3,
    borderLeftColor: colors.tertiaryFixed,
    padding: spacing.sm,
    ...shadows.card,
  },
  upgrade: { ...type.labelLg, color: colors.primary, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
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
