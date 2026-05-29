import { describe, expect, it, vi } from 'vitest';

import type { DatabaseSnapshot } from '../../storage/types';
import type { Group } from '../../types/models';
import { setCache } from '../../lib/dataCache';
import { getHomeSplitGroups } from '../homeService';

vi.mock('../groupService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../groupService')>();
  return {
    ...actual,
    buildGroupCards: vi.fn(() => [
      {
        id: 'group-member',
        name: 'Weekend Trip',
        memberCount: 2,
        totalSpentCents: 0,
        statusLabel: 'Active',
        balanceLabel: 'Settled',
        balancePositive: false,
        balanceStatus: 'settled' as const,
        imageKey: 'mountains' as const,
      },
    ]),
  };
});

function snapshot(partial: Partial<DatabaseSnapshot>): DatabaseSnapshot {
  return {
    users: [],
    profiles: [],
    groups: [],
    groupMembers: [],
    groupInvitations: [],
    teams: [],
    teamMembers: [],
    expenses: [],
    expenseSplits: [],
    settlements: [],
    receipts: [],
    categories: [],
    ...partial,
  };
}

describe('getHomeSplitGroups', () => {
  it('shows member groups even when settled with no spending', () => {
    setCache(snapshot({ groups: [{ id: 'group-member' } as Group] }));

    expect(getHomeSplitGroups('user-b')).toEqual([
      {
        id: 'group-member',
        name: 'Weekend Trip',
        balance: 'Settled',
        positive: false,
      },
    ]);
  });
});
