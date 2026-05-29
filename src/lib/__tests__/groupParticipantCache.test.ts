import { describe, expect, it, vi, beforeEach } from 'vitest';

import { setCache } from '../../lib/dataCache';
import {
  getCachedGroupParticipants,
  invalidateGroupParticipantCache,
  loadGroupParticipants,
} from '../../lib/groupParticipantCache';
import type { GroupMemberWithProfile } from '../../types/views';

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

vi.mock('../../services/memberService', () => ({
  getGroupMembersWithProfiles: (...args: unknown[]) => fetchMock(...args),
  filterDetailMembers: (members: GroupMemberWithProfile[]) => members,
  resolveMemberWithProfile: vi.fn(),
}));

function sampleMembers(groupId: string): GroupMemberWithProfile[] {
  return [
    {
      id: 'member-1',
      groupId,
      userId: 'user-1',
      displayName: 'Eric',
      role: 'owner',
      invitationStatus: 'active',
      isActive: true,
      avatarLabel: 'E',
      isRegistered: true,
    },
  ];
}

describe('groupParticipantCache', () => {
  beforeEach(() => {
    invalidateGroupParticipantCache();
    fetchMock.mockReset();
    setCache({
      users: [],
      profiles: [],
      groups: [],
      groupInvitations: [],
      groupMembers: [],
      teams: [],
      teamMembers: [],
      expenses: [],
      expenseSplits: [],
      categories: [],
      receipts: [],
      settlements: [],
    });
  });

  it('dedupes in-flight participant fetches', async () => {
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(sampleMembers('group-a')), 20);
        }),
    );

    const first = loadGroupParticipants('group-a');
    const second = loadGroupParticipants('group-a');
    const [rowsA, rowsB] = await Promise.all([first, second]);
    expect(rowsA).toEqual(rowsB);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getCachedGroupParticipants('group-a')).toHaveLength(1);
  });

  it('returns fresh cache without refetching', async () => {
    fetchMock.mockResolvedValue(sampleMembers('group-b'));
    await loadGroupParticipants('group-b');
    fetchMock.mockClear();

    const rows = await loadGroupParticipants('group-b');
    expect(rows).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
