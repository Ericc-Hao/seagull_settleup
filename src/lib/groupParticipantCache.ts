import { createLogger } from '../utils/logger';
import { getGroupMembers, readDb } from '../services/dbHelpers';
import {
  filterDetailMembers,
  getGroupMembersWithProfiles,
  resolveMemberWithProfile,
} from '../services/memberService';
import type { GroupMemberWithProfile } from '../types/views';
import { filterSplitSelectableMembers } from '../utils/groupParticipants';

const logger = createLogger('groupParticipantCache');

export const GROUP_PARTICIPANT_STALE_MS = 60_000;

export type GroupParticipantFilter = 'split' | 'detail' | 'all';

interface ParticipantCacheEntry {
  data: GroupMemberWithProfile[];
  lastFetchedAt: number;
}

const participantsByGroupId = new Map<string, ParticipantCacheEntry>();
const participantsInFlight = new Map<string, Promise<GroupMemberWithProfile[]>>();

export function applyGroupParticipantFilter(
  members: GroupMemberWithProfile[],
  filter: GroupParticipantFilter,
): GroupMemberWithProfile[] {
  switch (filter) {
    case 'split':
      return filterSplitSelectableMembers(members);
    case 'detail':
      return filterDetailMembers(members);
    case 'all':
    default:
      return members;
  }
}

export function getGroupParticipantsFromDbCache(groupId: string): GroupMemberWithProfile[] {
  const db = readDb();
  return getGroupMembers(groupId, db)
    .map((member) => resolveMemberWithProfile(member.id, groupId, db))
    .filter((member): member is GroupMemberWithProfile => Boolean(member));
}

export function getCachedGroupParticipants(groupId: string): GroupMemberWithProfile[] | null {
  return participantsByGroupId.get(groupId)?.data ?? null;
}

export function invalidateGroupParticipantCache(groupId?: string): void {
  if (groupId) {
    participantsByGroupId.delete(groupId);
    participantsInFlight.delete(groupId);
    logger.info('Group participant cache invalidated', { groupId });
    return;
  }
  participantsByGroupId.clear();
  participantsInFlight.clear();
  logger.info('Group participant cache cleared');
}

export async function loadGroupParticipants(
  groupId: string,
  options?: { force?: boolean },
): Promise<GroupMemberWithProfile[]> {
  const cached = participantsByGroupId.get(groupId);
  const ageMs = cached ? Date.now() - cached.lastFetchedAt : Number.POSITIVE_INFINITY;
  if (cached && ageMs < GROUP_PARTICIPANT_STALE_MS && !options?.force) {
    return cached.data;
  }

  const inFlight = participantsInFlight.get(groupId);
  if (inFlight) {
    return inFlight;
  }

  logger.info('Group participants fetch started', { groupId, force: Boolean(options?.force) });

  const promise = getGroupMembersWithProfiles(groupId)
    .then((data) => {
      participantsByGroupId.set(groupId, { data, lastFetchedAt: Date.now() });
      participantsInFlight.delete(groupId);
      logger.info('Group participants fetch succeeded', { groupId, count: data.length });
      return data;
    })
    .catch((error) => {
      participantsInFlight.delete(groupId);
      logger.error('Group participants fetch failed', error, { groupId });
      throw error;
    });

  participantsInFlight.set(groupId, promise);
  return promise;
}
