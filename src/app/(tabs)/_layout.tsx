import { useRouter } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { colors, radii, shadows, spacing, TAB_BAR_HEIGHT, type } from '@/constants/theme';

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
        <Icon
          name={item.icon}
          size={22}
          color={focused ? colors.primary : colors.onSurfaceVariant}
        />
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    // The FAB overhangs the bar, so it must stay inside this wrapper's bounds —
    // Android does not deliver touches to children drawn outside their parent.
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
          accessibilityLabel="Scan a business card"
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Icon name="document_scanner" size={27} color={colors.onPrimary} />
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
  tabLabel: { ...type.label, fontSize: 10, color: colors.onSurfaceVariant },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
  fabSlot: { width: 76 },
  fabLayer: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
  fabPressed: { backgroundColor: colors.primaryPressed },
  fabLabel: {
    ...type.label,
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    marginTop: 3,
  },
});
