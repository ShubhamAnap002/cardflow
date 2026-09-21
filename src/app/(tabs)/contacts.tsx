import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Chip } from '@/components/chip';
import { ContactCard } from '@/components/contact-card';
import { Icon } from '@/components/icon';
import { Screen, useBottomInset } from '@/components/screen';
import { EmptyState } from '@/components/tiles';
import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { callNumber, sendEmail } from '@/lib/actions';
import { initialsOf, toggleFavorite, type Contact } from '@/lib/storage';
import { useCardflow } from '@/lib/use-cardflow';

type Filter = 'all' | 'favorites' | 'review';

function matches(contact: Contact, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [contact.name, contact.title, contact.company, contact.email, contact.phone, contact.group]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(needle));
}

export default function ContactsScreen() {
  const params = useLocalSearchParams<{ filter?: string; group?: string }>();
  const { profile, contacts, groups, setContacts } = useCardflow();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [group, setGroup] = useState<string | undefined>();
  const bottom = useBottomInset(true);

  // Home and Groups deep-link into a pre-filtered list.
  useEffect(() => {
    if (params.filter === 'favorites' || params.filter === 'review') setFilter(params.filter);
    else if (params.filter === 'all') setFilter('all');
  }, [params.filter]);

  useEffect(() => {
    setGroup(params.group || undefined);
  }, [params.group]);

  const visible = useMemo(() => {
    return contacts.filter((contact) => {
      if (group && contact.group !== group) return false;
      if (filter === 'favorites' && !contact.favorite) return false;
      if (filter === 'review' && (contact.confidence ?? 100) >= 90) return false;
      return matches(contact, query);
    });
  }, [contacts, filter, group, query]);

  async function onToggleFavorite(id: string) {
    setContacts(await toggleFavorite(id));
  }

  const activeCount = contacts.length;

  return (
    <Screen>
      <AppHeader
        title="Contacts"
        profile={{ initials: initialsOf(profile.name), uri: profile.avatarUri }}
        onProfile={() => router.push('/profile')}
      />

      <FlatList
        data={visible}
        keyExtractor={(contact) => contact.id}
        contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.search}>
              <Icon name="search" size={19} color={colors.outline} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={`Search ${activeCount} contacts`}
                placeholderTextColor={colors.outline}
                style={styles.searchInput}
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {query.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={8}
                  onPress={() => setQuery('')}
                >
                  <Icon name="close" size={18} color={colors.outline} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              <Chip
                label="All"
                selected={filter === 'all' && !group}
                onPress={() => {
                  setFilter('all');
                  setGroup(undefined);
                }}
              />
              <Chip
                label="Favorites"
                icon="star"
                selected={filter === 'favorites'}
                onPress={() => {
                  setFilter(filter === 'favorites' ? 'all' : 'favorites');
                  setGroup(undefined);
                }}
              />
              <Chip
                label="Needs review"
                icon="error"
                tone="warning"
                selected={filter === 'review'}
                onPress={() => {
                  setFilter(filter === 'review' ? 'all' : 'review');
                  setGroup(undefined);
                }}
              />
              {groups.map((item) => (
                <Chip
                  key={item.id}
                  label={item.name}
                  selected={group === item.name}
                  onPress={() => setGroup(group === item.name ? undefined : item.name)}
                />
              ))}
            </ScrollView>

            <Text style={styles.count}>
              {visible.length} {visible.length === 1 ? 'contact' : 'contacts'}
              {group ? ` in ${group}` : ''}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        ListEmptyComponent={
          <EmptyState
            icon="contacts"
            title={contacts.length === 0 ? 'No contacts yet' : 'Nothing matches'}
            body={
              contacts.length === 0
                ? 'Scan a business card and it will land here instantly.'
                : 'Try a different search term or clear the filters above.'
            }
          />
        }
        renderItem={({ item }) => (
          <ContactCard
            contact={item}
            onPress={() => router.push(`/contact/${item.id}`)}
            onCall={() => callNumber(item.phone)}
            onEmail={() => sendEmail(item.email)}
            onToggleFavorite={() => onToggleFavorite(item.id)}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  header: { gap: spacing.xs, marginBottom: spacing.xs },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  searchInput: { flex: 1, ...type.body, color: colors.onSurface, paddingVertical: 0 },
  chips: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  count: { ...type.label, color: colors.onSurfaceVariant, paddingLeft: spacing.xxs },
  gap: { height: spacing.xs },
});
