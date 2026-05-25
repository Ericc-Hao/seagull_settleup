import type { DatabaseSnapshot } from '../storage/types';
import {
  createEmptySnapshot,
  readCache,
  setCache,
} from './dataCache';
import {
  mapCategory,
  mapExpense,
  mapExpenseSplit,
  mapGroup,
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

const logger = createLogger('supabaseSnapshot');

export { readCache, setCache } from './dataCache';

export async function refreshCache(): Promise<DatabaseSnapshot> {
  logger.debug('Refresh cache started');
  const session = await supabase.auth.getSession();
  if (!session.data.session?.user) {
    setCache(createEmptySnapshot());
    logger.debug('Refresh cache skipped', { reason: 'no_session' });
    return readCache();
  }

  const tables = [
    supabase.from('profiles').select('*'),
    supabase.from('groups').select('*'),
    supabase.from('group_members').select('*'),
    supabase.from('group_invitations').select('*'),
    supabase.from('teams').select('*'),
    supabase.from('team_members').select('*'),
    supabase.from('expenses').select('*').is('deleted_at', null),
    supabase.from('expense_splits').select('*'),
    supabase.from('settlements').select('*'),
    supabase.from('receipts').select('*'),
    supabase.from('categories').select('*'),
  ] as const;

  const results = await Promise.all(tables);
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    logger.warn('Refresh cache failed', { message: firstError.message });
    setCache(createEmptySnapshot());
    return readCache();
  }

  const [
    profilesRes,
    groupsRes,
    membersRes,
    invitationsRes,
    teamsRes,
    teamMembersRes,
    expensesRes,
    splitsRes,
    settlementsRes,
    receiptsRes,
    categoriesRes,
  ] =
    results;

  const profiles = (profilesRes.data ?? []).map(mapProfile);

  setCache({
    users: (profilesRes.data ?? []).map((row) => mapUserFromProfile(row, row.emt_email ?? '')),
    profiles,
    groups: (groupsRes.data ?? []).map(mapGroup),
    groupMembers: (membersRes.data ?? []).map(mapGroupMember),
    groupInvitations: (invitationsRes.data ?? []).map(mapGroupInvitation),
    teams: (teamsRes.data ?? []).map(mapTeam),
    teamMembers: (teamMembersRes.data ?? []).map(mapTeamMember),
    expenses: (expensesRes.data ?? []).map(mapExpense),
    expenseSplits: (splitsRes.data ?? []).map(mapExpenseSplit),
    settlements: (settlementsRes.data ?? []).map(mapSettlement),
    receipts: (receiptsRes.data ?? []).map(mapReceipt),
    categories: (categoriesRes.data ?? []).map(mapCategory),
  });

  logger.debug('Refresh cache succeeded', {
    groups: groupsRes.data?.length ?? 0,
    expenses: expensesRes.data?.length ?? 0,
    invitations: invitationsRes.data?.length ?? 0,
  });

  return readCache();
}
