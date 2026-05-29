import type { DatabaseSnapshot } from '../storage/types';

import { createEmptySnapshot, mergeCache, readCache, setCache } from './dataCache';
import {
  mapCategory,
  mapExpense,
  mapExpenseSplit,
  mapGroupInvitation,
  mapGroupMember,
  mapProfile,
  mapReceipt,
  mapSettlement,
  mapTeam,
  mapTeamMember,
  mapUserFromProfile,
} from './mappers';
import { supabase } from './supabase';
import { createLogger } from '../utils/logger';
import { fetchGroupsForCurrentUser } from '../services/groupAccess';

const logger = createLogger('cacheRefresh');

export type CacheSliceKey =
  | 'profile'
  | 'groups'
  | 'group_members'
  | 'expenses'
  | 'settlements'
  | 'receipts';

export const ALL_CACHE_SLICES: CacheSliceKey[] = [
  'profile',
  'groups',
  'group_members',
  'expenses',
  'settlements',
  'receipts',
];

async function requireSessionUserId(): Promise<string | null> {
  const session = await supabase.auth.getSession();
  return session.data.session?.user?.id ?? null;
}

async function fetchProfileSlice(): Promise<Partial<DatabaseSnapshot>> {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    throw error;
  }
  const profiles = (data ?? []).map(mapProfile);
  return {
    profiles,
    users: (data ?? []).map((row) => mapUserFromProfile(row, row.emt_email ?? '')),
  };
}

async function fetchGroupsSlice(): Promise<Partial<DatabaseSnapshot>> {
  const userId = await requireSessionUserId();
  if (!userId) {
    return {
      groups: [],
      teams: [],
      teamMembers: [],
    };
  }

  const [groups, teamsRes, teamMembersRes] = await Promise.all([
    fetchGroupsForCurrentUser(userId),
    supabase.from('teams').select('*'),
    supabase.from('team_members').select('*'),
  ]);
  const firstError = [teamsRes, teamMembersRes].find((result) => result.error)?.error;
  if (firstError) {
    throw firstError;
  }
  return {
    groups,
    teams: (teamsRes.data ?? []).map(mapTeam),
    teamMembers: (teamMembersRes.data ?? []).map(mapTeamMember),
  };
}

async function fetchGroupMembersSlice(): Promise<Partial<DatabaseSnapshot>> {
  const [membersRes, invitationsRes] = await Promise.all([
    supabase.from('group_members').select('*'),
    supabase.from('group_invitations').select('*'),
  ]);
  const firstError = [membersRes, invitationsRes].find((result) => result.error)?.error;
  if (firstError) {
    throw firstError;
  }
  return {
    groupMembers: (membersRes.data ?? []).map(mapGroupMember),
    groupInvitations: (invitationsRes.data ?? []).map(mapGroupInvitation),
  };
}

async function fetchExpensesSlice(): Promise<Partial<DatabaseSnapshot>> {
  const [expensesRes, splitsRes, categoriesRes] = await Promise.all([
    supabase.from('expenses').select('*').is('deleted_at', null),
    supabase.from('expense_splits').select('*'),
    supabase.from('categories').select('*'),
  ]);
  const firstError = [expensesRes, splitsRes, categoriesRes].find((result) => result.error)?.error;
  if (firstError) {
    throw firstError;
  }
  return {
    expenses: (expensesRes.data ?? []).map(mapExpense),
    expenseSplits: (splitsRes.data ?? []).map(mapExpenseSplit),
    categories: (categoriesRes.data ?? []).map(mapCategory),
  };
}

async function fetchSettlementsSlice(): Promise<Partial<DatabaseSnapshot>> {
  const { data, error } = await supabase.from('settlements').select('*');
  if (error) {
    throw error;
  }
  return {
    settlements: (data ?? []).map(mapSettlement),
  };
}

async function fetchReceiptsSlice(): Promise<Partial<DatabaseSnapshot>> {
  const { data, error } = await supabase.from('receipts').select('*');
  if (error) {
    throw error;
  }
  return {
    receipts: (data ?? []).map(mapReceipt),
  };
}

const sliceFetchers: Record<CacheSliceKey, () => Promise<Partial<DatabaseSnapshot>>> = {
  profile: fetchProfileSlice,
  groups: fetchGroupsSlice,
  group_members: fetchGroupMembersSlice,
  expenses: fetchExpensesSlice,
  settlements: fetchSettlementsSlice,
  receipts: fetchReceiptsSlice,
};

export type CacheSliceLoadingKey =
  | 'profileLoading'
  | 'groupsLoading'
  | 'expensesLoading'
  | 'settlementsLoading';

const sliceLoadingKeys: Record<CacheSliceKey, CacheSliceLoadingKey> = {
  profile: 'profileLoading',
  groups: 'groupsLoading',
  group_members: 'groupsLoading',
  expenses: 'expensesLoading',
  settlements: 'settlementsLoading',
  receipts: 'expensesLoading',
};

export function getLoadingKeysForSlices(slices: Iterable<CacheSliceKey>): Set<CacheSliceLoadingKey> {
  const keys = new Set<CacheSliceLoadingKey>();
  for (const slice of slices) {
    keys.add(sliceLoadingKeys[slice]);
  }
  return keys;
}

export async function refreshCacheSlice(slice: CacheSliceKey): Promise<void> {
  const userId = await requireSessionUserId();
  if (!userId) {
    setCache(createEmptySnapshot());
    logger.debug('Cache slice refresh skipped', { slice, reason: 'no_session' });
    return;
  }

  logger.info('Cache slice refresh started', { slice });
  const patch = await sliceFetchers[slice]();
  mergeCache(patch);
  logger.info('Cache slice refresh succeeded', { slice });
}

export async function refreshCacheSlices(slices: CacheSliceKey[]): Promise<void> {
  const uniqueSlices = Array.from(new Set(slices));
  if (uniqueSlices.length === 0) {
    return;
  }

  const userId = await requireSessionUserId();
  if (!userId) {
    setCache(createEmptySnapshot());
    logger.debug('Cache slices refresh skipped', { reason: 'no_session' });
    return;
  }

  logger.info('Cache slices refresh started', { slices: uniqueSlices });
  const patches = await Promise.all(uniqueSlices.map((slice) => sliceFetchers[slice]()));
  const merged = patches.reduce<Partial<DatabaseSnapshot>>((acc, patch) => ({ ...acc, ...patch }), {});
  mergeCache(merged);
  logger.info('Cache slices refresh succeeded', { slices: uniqueSlices });
}

/** Full cache refresh — used only on initial load and explicit refresh-all. */
export async function refreshAllCache(): Promise<DatabaseSnapshot> {
  logger.info('Full cache refresh started');
  const userId = await requireSessionUserId();
  if (!userId) {
    setCache(createEmptySnapshot());
    logger.info('Full cache refresh skipped', { reason: 'no_session' });
    return readCache();
  }

  await refreshCacheSlices(ALL_CACHE_SLICES);
  logger.info('Full cache refresh succeeded');
  return readCache();
}
