export type SplitMethod = 'equal' | 'custom';
export type GroupStatus = 'planning' | 'active' | 'ready_to_settle' | 'settled' | 'archived';
export type SettlementMode = 'individual' | 'team';
export type GroupType = 'Trip' | 'Dinner' | 'Camping' | 'Skiing' | 'Roommate' | 'Other';

export interface Member {
  id: string;
  displayName: string;
  nickname?: string;
  teamId?: string;
  emtEmail?: string;
  emtPhone?: string;
}

export interface Team {
  id: string;
  name: string;
  receiverMemberId: string;
}

export interface ExpenseSplit {
  memberId: string;
  shareCents: number;
}

export interface Expense {
  id: string;
  payerMemberId: string;
  amountCents: number;
  splits: ExpenseSplit[];
  participantIds: string[];
  splitMethod: SplitMethod;
  category: string;
  note: string;
  expenseDate: string;
}

export interface Group {
  id: string;
  name: string;
  tripType: GroupType;
  destination: string;
  startDate: string;
  endDate: string;
  currency: 'CAD';
  status: GroupStatus;
  settlementMode: SettlementMode;
  members: Member[];
  teams: Team[];
  expenses: Expense[];
}

export interface HomeOverview {
  totalSpentCents: number;
  youOwedCents: number;
  youOweCents: number;
}

export interface CategoryRow {
  id: string;
  label: string;
  amountCents: number;
  icon: string;
  tint: string;
  bg: string;
}

export interface GroupCardData {
  id: string;
  name: string;
  memberCount: number;
  totalSpentCents: number;
  statusLabel: string;
  balanceLabel: string;
  balancePositive: boolean;
  imageKey: 'mountains' | 'bridge';
}
