import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { GroupCard } from '@/components/group-card';
import { Icon } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { Screen, ScreenBody } from '@/components/screen';
import { Section } from '@/components/section';
import { EmptyState, StatTile } from '@/components/tiles';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { confirm, notify } from '@/lib/feedback';
import { addGroup, countInGroup, deleteGroup, initialsOf, listGroups } from '@/lib/storage';
import { useCardflow } from '@/lib/use-cardflow';

export default function GroupsScreen() {
  const { profile, contacts, groups, setGroups } = useCardflow();
  const [composing, setComposing] = useState(false);
  const [name, setName] = useState('');

  const grouped = contacts.filter((contact) => Boolean(contact.group)).length;

  async function onCreate() {
    const trimmed = name.trim();
    if (!trimmed) return notify('Give the group a name first.');
    if (groups.some((group) => group.name.toLowerCase() === trimmed.toLowerCase())) {
      return notify('A group with that name already exists.');
    }
    try {
      await addGroup(trimmed, 'Created on this device');
      setGroups(await listGroups());
      setName('');
      setComposing(false);
      notify(`"${trimmed}" created.`);
    } catch {
      notify('Could not create that group.');
    }
  }

  function onDelete(id: string, groupName: string) {
    confirm(
      'Delete group?',
      `"${groupName}" will be removed. The contacts inside it are kept.`,
      'Delete',
      async () => {
        try {
          setGroups(await deleteGroup(id));
          notify('Group deleted.');
        } catch {
          notify('Could not delete that group.');
        }
      }
    );
  }

  return (
    <Screen>
      <AppHeader
        title="Groups"
        profile={{ initials: initialsOf(profile.name), uri: profile.avatarUri }}
        onProfile={() => router.push('/profile')}
        onSettings={() => router.navigate('/settings')}
      />

      <ScreenBody tabBar>
        <View style={styles.row}>
          <StatTile value={String(groups.length)} label="Groups" icon="folder_shared" />
          <StatTile
            value={String(grouped)}
            label="Contacts grouped"
            icon="groups"
            tint={colors.secondary}
          />
          <StatTile
            value={String(contacts.length - grouped)}
            label="Ungrouped"
            icon="label"
            tint={colors.tertiary}
          />
        </View>

        {composing ? (
          <View style={styles.composer}>
            <Text style={styles.composerLabel}>New group name</Text>
            <TextInput
              accessibilityLabel="New group name"
              value={name}
              onChangeText={setName}
              placeholder="Group name"
              placeholderTextColor={colors.outline}
              style={styles.input}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onCreate}
            />
            <View style={styles.composerActions}>
              <PrimaryButton
                label="Cancel"
                variant="ghost"
                compact
                style={styles.flex}
                onPress={() => {
                  setComposing(false);
                  setName('');
                }}
              />
              <PrimaryButton label="Create" compact style={styles.flex} onPress={onCreate} />
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a group"
            onPress={() => setComposing(true)}
            style={({ pressed }) => [styles.newGroup, pressed && styles.newGroupPressed]}
          >
            <Icon name="group_add" size={20} color={colors.primary} />
            <Text style={styles.newGroupText}>Create a group</Text>
          </Pressable>
        )}

        <Section title="Your groups">
          {groups.length === 0 ? (
            <EmptyState
              icon="folder_special"
              title="No groups yet"
              body="Groups keep event leads, investors and clients apart. Create one above."
            />
          ) : (
            groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                count={countInGroup(contacts, group.name)}
                onPress={() => router.navigate(`/contacts?group=${encodeURIComponent(group.name)}`)}
                onDelete={() => onDelete(group.id, group.name)}
              />
            ))
          )}
        </Section>
      </ScreenBody>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  flex: { flex: 1 },
  newGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 50,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  newGroupPressed: { backgroundColor: colors.surfaceLow },
  newGroupText: { ...type.labelLg, color: colors.primary, fontWeight: '700' },
  composer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.sm,
    gap: spacing.xs,
    ...shadows.card,
  },
  composerLabel: { ...type.label, color: colors.onSurfaceVariant },
  composerActions: { flexDirection: 'row', gap: spacing.xs },
  input: {
    minHeight: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: spacing.sm,
    ...type.body,
    color: colors.onSurface,
  },
});
