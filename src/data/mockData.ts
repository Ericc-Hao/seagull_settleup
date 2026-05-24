import type { CategoryRow, Group, GroupCardData, HomeOverview, Member } from './types';

/** Active user for mock UI */
export const MOCK_USER: Member = {
  id: 'A',
  displayName: 'Eric',
  emtEmail: 'eric@example.com',
  emtPhone: '647-111-2222',
};

export const MOCK_GROUPS: Group[] = [
  {
    id: 'group-banff',
    name: 'Banff Trip',
    tripType: 'Trip',
    destination: 'Banff, Alberta',
    startDate: '2026-05-20',
    endDate: '2026-05-25',
    currency: 'CAD',
    status: 'ready_to_settle',
    settlementMode: 'team',
    members: [
      { id: 'A', displayName: 'Eric', teamId: 'AC', emtEmail: 'eric@example.com' },
      { id: 'B', displayName: 'Ben', teamId: 'BD', emtEmail: 'ben@example.com' },
      { id: 'C', displayName: 'Carol', teamId: 'AC', emtEmail: 'carol@example.com' },
      { id: 'D', displayName: 'Dylan', teamId: 'BD', emtEmail: 'dylan@example.com' },
    ],
    teams: [
      { id: 'AC', name: 'AC Couple', receiverMemberId: 'A' },
      { id: 'BD', name: 'BD Couple', receiverMemberId: 'B' },
    ],
    expenses: [
      {
        id: 'e1',
        payerMemberId: 'A',
        amountCents: 200_000,
        splits: splitEqual(['A', 'B', 'C', 'D'], 200_000),
        participantIds: ['A', 'B', 'C', 'D'],
        splitMethod: 'equal',
        category: 'Hotel',
        note: 'Banff Hotel',
        expenseDate: '2026-05-24',
      },
      {
        id: 'e2',
        payerMemberId: 'B',
        amountCents: 42_050,
        splits: splitEqual(['A', 'B', 'C', 'D'], 42_050),
        participantIds: ['A', 'B', 'C', 'D'],
        splitMethod: 'equal',
        category: 'Food',
        note: 'Food & Drinks',
        expenseDate: '2026-05-24',
      },
      {
        id: 'e3',
        payerMemberId: 'A',
        amountCents: 18_000,
        splits: splitEqual(['A', 'B', 'C', 'D'], 18_000),
        participantIds: ['A', 'B', 'C', 'D'],
        splitMethod: 'equal',
        category: 'Gas',
        note: 'Transportation',
        expenseDate: '2026-05-22',
      },
      {
        id: 'e4',
        payerMemberId: 'C',
        amountCents: 26_000,
        splits: splitEqual(['A', 'B', 'C', 'D'], 26_000),
        participantIds: ['A', 'B', 'C', 'D'],
        splitMethod: 'equal',
        category: 'Shopping',
        note: 'Shopping',
        expenseDate: '2026-05-23',
      },
    ],
  },
  {
    id: 'group-waterloo',
    name: 'Waterloo Dinner',
    tripType: 'Dinner',
    destination: 'Waterloo, ON',
    startDate: '2026-05-18',
    endDate: '2026-05-18',
    currency: 'CAD',
    status: 'active',
    settlementMode: 'individual',
    members: [
      { id: 'W1', displayName: 'Alex', emtEmail: 'alex@example.com' },
      { id: 'W2', displayName: 'Blake', emtEmail: 'blake@example.com' },
      { id: 'W3', displayName: 'Casey', emtEmail: 'casey@example.com' },
      { id: 'W4', displayName: 'Dana', emtEmail: 'dana@example.com' },
    ],
    teams: [],
    expenses: [
      {
        id: 'ew1',
        payerMemberId: 'W2',
        amountCents: 18_840,
        splits: splitEqual(['W1', 'W2', 'W3', 'W4'], 18_840),
        participantIds: ['W1', 'W2', 'W3', 'W4'],
        splitMethod: 'equal',
        category: 'Food',
        note: 'Dinner tab',
        expenseDate: '2026-05-18',
      },
    ],
  },
];

export const MOCK_SETTLEMENT = {
  fromTeam: 'BD Couple',
  toTeam: 'AC Couple',
  amountCents: 55_000,
  receiver: 'A',
  emt: 'a@email.com',
  message: 'Banff Trip Settlement - BD Couple to AC Couple',
  individualTransferCount: 3,
};

export const CATEGORY_META: Record<string, { label: string; icon: string; tint: string; bg: string }> = {
  Food: { label: 'Food & Drinks', icon: 'building-storefront', tint: '#F97316', bg: '#FFF7ED' },
  Hotel: { label: 'Rent & Bills', icon: 'home-modern', tint: '#8B5CF6', bg: '#F5F3FF' },
  Gas: { label: 'Transportation', icon: 'truck', tint: '#3B82F6', bg: '#EFF6FF' },
  Shopping: { label: 'Shopping', icon: 'shopping-bag', tint: '#14B8A6', bg: '#F0FDFA' },
  Grocery: { label: 'Grocery', icon: 'shopping-cart', tint: '#22C55E', bg: '#F0FDF4' },
  Other: { label: 'Other', icon: 'ellipsis', tint: '#64748B', bg: '#F1F5F9' },
};

function splitEqual(memberIds: string[], totalCents: number) {
  const per = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents - per * memberIds.length;
  return memberIds.map((memberId, i) => ({
    memberId,
    shareCents: per + (i === 0 ? remainder : 0),
  }));
}

export function formatCad(cents: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);
}

export function getGroupById(id: string): Group | undefined {
  return MOCK_GROUPS.find((g) => g.id === id);
}

export function buildHomeOverview(activeMemberId: string): HomeOverview {
  let totalSpentCents = 0;
  let youOwedCents = 0;
  let youOweCents = 0;

  for (const group of MOCK_GROUPS) {
    for (const expense of group.expenses) {
      totalSpentCents += expense.amountCents;
    }
    const balance = memberBalanceCents(group, activeMemberId);
    if (balance > 0) youOwedCents += balance;
    if (balance < 0) youOweCents += Math.abs(balance);
  }

  return { totalSpentCents, youOwedCents, youOweCents };
}

export function buildCategoryRows(): CategoryRow[] {
  const map = new Map<string, number>();
  for (const group of MOCK_GROUPS) {
    for (const expense of group.expenses) {
      const key = expense.category;
      map.set(key, (map.get(key) ?? 0) + expense.amountCents);
    }
  }
  return Array.from(map.entries())
    .map(([id, amountCents]) => {
      const meta = CATEGORY_META[id] ?? CATEGORY_META.Other;
      return { id, label: meta.label, amountCents, icon: meta.icon, tint: meta.tint, bg: meta.bg };
    })
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 4);
}

function memberBalanceCents(group: Group, memberId: string): number {
  let paid = 0;
  let owed = 0;
  for (const expense of group.expenses) {
    if (expense.payerMemberId === memberId) paid += expense.amountCents;
    const split = expense.splits.find((s) => s.memberId === memberId);
    if (split) owed += split.shareCents;
  }
  return paid - owed;
}

export function buildGroupCards(activeMemberId: string): GroupCardData[] {
  return MOCK_GROUPS.map((group, index) => {
    const totalSpentCents = group.expenses.reduce((s, e) => s + e.amountCents, 0);
    const balance = memberBalanceCents(group, activeMemberId);
    const positive = balance > 0;
    return {
      id: group.id,
      name: group.name,
      memberCount: group.members.length,
      totalSpentCents,
      statusLabel: group.status === 'ready_to_settle' ? 'Not Settled' : 'Pending',
      balanceLabel:
        balance === 0
          ? ''
          : positive
            ? `You are owed ${formatCad(balance)}`
            : `You owe ${formatCad(Math.abs(balance))}`,
      balancePositive: positive,
      imageKey: index === 0 ? 'mountains' : 'bridge',
    };
  });
}

export const QUICK_ACTIONS = [
  { id: 'scan', label: 'Scan Receipt', icon: 'viewfinder-circle', tint: '#3B82F6', bg: '#EFF6FF' },
  { id: 'create', label: 'Create Group', icon: 'user-group', tint: '#10B981', bg: '#ECFDF5' },
  { id: 'settle', label: 'Settle Up', icon: 'currency-dollar', tint: '#F97316', bg: '#FFF7ED' },
  { id: 'personal', label: 'Personal', icon: 'user', tint: '#8B5CF6', bg: '#F5F3FF' },
] as const;

export const GROUP_TYPES = ['Trip', 'Dinner', 'Camping', 'Skiing', 'Roommate', 'Other'] as const;

export const EXPENSE_CATEGORIES = ['Hotel', 'Food', 'Gas', 'Ticket', 'Grocery', 'Other'] as const;
