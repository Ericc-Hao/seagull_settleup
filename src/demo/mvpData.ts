import {
  buildEqualSplits,
  calculateMemberBalances,
  calculateTeamBalances,
  Expense,
  GroupMember,
  optimizeTransfers,
  Team,
} from '../core/settlement';

export type DemoCategory =
  | 'food'
  | 'hotel'
  | 'gas'
  | 'ticket'
  | 'grocery'
  | 'parking'
  | 'rental'
  | 'activity'
  | 'shopping'
  | 'other';

export interface DemoGroup {
  id: string;
  name: string;
  currency: 'CAD';
  settlementMode: 'individual' | 'team';
  status: 'active' | 'settled';
}

export interface DemoExpense extends Expense {
  note: string;
  category: DemoCategory;
  expenseDate: string;
}

export const demoGroup: DemoGroup = {
  id: 'group-banff',
  name: 'Banff Trip',
  currency: 'CAD',
  settlementMode: 'individual',
  status: 'active',
};

export const demoMembers: GroupMember[] = [
  { id: 'A', displayName: 'Eric', teamId: 'AC' },
  { id: 'B', displayName: 'Ben', teamId: 'BD' },
  { id: 'C', displayName: 'Carol', teamId: 'AC' },
  { id: 'D', displayName: 'Dylan', teamId: 'BD' },
];

export const demoTeams: Team[] = [
  { id: 'AC', name: 'AC Couple', receiverMemberId: 'A' },
  { id: 'BD', name: 'BD Couple', receiverMemberId: 'B' },
];

export const demoExpenses: DemoExpense[] = [
  {
    id: 'expense-1',
    payerMemberId: 'A',
    amountCents: 200000,
    splits: buildEqualSplits(['A', 'B', 'C', 'D'], 200000),
    category: 'hotel',
    note: 'Banff Hotel Booking',
    expenseDate: '2026-05-24',
  },
  {
    id: 'expense-2',
    payerMemberId: 'B',
    amountCents: 90000,
    splits: buildEqualSplits(['A', 'B', 'C', 'D'], 90000),
    category: 'food',
    note: 'Group Meals',
    expenseDate: '2026-05-24',
  },
];

export const demoMemberBalances = calculateMemberBalances(demoMembers, demoExpenses);

export const demoIndividualTransfers = optimizeTransfers(
  demoMemberBalances.map((entry) => ({
    id: entry.memberId,
    balanceCents: entry.balanceCents,
  })),
);

const teamBalances = calculateTeamBalances(demoMembers, demoTeams, demoMemberBalances);
export const demoTeamTransfers = optimizeTransfers(
  teamBalances.map((entry) => ({
    id: entry.teamId,
    balanceCents: entry.balanceCents,
  })),
);

export function formatCad(amountCents: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amountCents / 100);
}
