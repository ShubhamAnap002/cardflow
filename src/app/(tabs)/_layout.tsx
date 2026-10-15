import { useRouter } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { colors, fonts, radii, shadows, spacing, TAB_BAR_HEIGHT } from '@/constants/theme';

type TabItem = { name: string; href: string; label: string; icon: IconName };

const LEFT: TabItem[] = [
  { name: 'index', href: '/', label: 'Home', icon: 'dashboard' },
  { name: 'contacts', href: '/contacts', label: 'Contacts', icon: 'contacts' },
];

const RIGHT: TabItem[] = [
  { name: 'groups', href: '/groups', label: 'Groups', icon: 'folder_shared' },
  { name: 'settings', href: '/settings', label: 'Settings', icon: 'tune' },
];

function CardFlowTabBar({ state, insets }: BottomTabBarProps) {
  const router = useRouter();
  const active = state.routes[state.index]?.name;

  const renderItem = (item: TabItem) => {
    const focused = active === item.name;
    return (
      <Pressable
        key={item.name}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={item.label}
        onPress={() => router.navigate(item.href)}
        style={styles.tab}
      >
        <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
          <Icon
            name={item.icon}
            size={22}
            color={focused ? colors.primary : colors.onSurfaceVariant}
          />
        </View>
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]}>
      <View style={styles.surface} />
      <View style={styles.barRow}>
        {LEFT.map(renderItem)}
        <View style={styles.fabSlot} />
        {RIGHT.map(renderItem)}
      </View>

      <View style={styles.fabLayer} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan a card or QR code"
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [styles.fabRing, pressed && styles.fabPressed]}
        >
          <View style={styles.fab}>
            <Icon name="document_scanner" size={27} color={colors.onPrimary} />
          </View>
        </Pressable>
        <Text style={styles.fabLabel}>Scan</Text>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CardFlowTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="contacts" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const FAB_OVERHANG = 22;

const styles = StyleSheet.create({
  wrap: { paddingTop: FAB_OVERHANG },
  surface: {
    position: 'absolute',
    top: FAB_OVERHANG,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    ...shadows.raised,
  },
  barRow: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabIconWrap: {
    width: 36,
    height: 28,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: { backgroundColor: colors.primarySoft },
  tabLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  tabLabelActive: { color: colors.primary, fontFamily: fonts.bold },
  fabSlot: { width: 76 },
  fabLayer: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  fabRing: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tertiaryFixed,
    padding: 4,
    ...shadows.fab,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  fabLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.primary,
    marginTop: 2,
  },
});
