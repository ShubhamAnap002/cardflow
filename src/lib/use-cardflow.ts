import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  DEFAULT_PROFILE,
  listContacts,
  listGroups,
  loadProfile,
  type Contact,
  type Group,
  type Profile,
} from '@/lib/storage';

type Store = {
  loading: boolean;
  profile: Profile;
  contacts: Contact[];
  groups: Group[];
};

const EMPTY: Store = { loading: true, profile: DEFAULT_PROFILE, contacts: [], groups: [] };

/**
 * Reads the whole (tiny) local store and refreshes on every focus, so saving a
 * scan or editing a profile is reflected the moment you land back on a screen.
 */
export function useCardflow() {
  const [store, setStore] = useState<Store>(EMPTY);

  const load = useCallback(async (alive: () => boolean) => {
    const [profile, contacts, groups] = await Promise.all([
      loadProfile(),
      listContacts(),
      listGroups(),
    ]);
    if (alive()) setStore({ loading: false, profile, contacts, groups });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load(() => active);
      return () => {
        active = false;
      };
    }, [load])
  );

  const reload = useCallback(() => load(() => true), [load]);

  const setContacts = useCallback((contacts: Contact[]) => {
    setStore((prev) => ({ ...prev, contacts }));
  }, []);

  const setGroups = useCallback((groups: Group[]) => {
    setStore((prev) => ({ ...prev, groups }));
  }, []);

  return { ...store, setContacts, setGroups, reload };
}
