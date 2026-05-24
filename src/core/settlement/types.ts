export type SettlementMode = 'individual' | 'team';

export interface GroupMember {
  id: string;
  displayName: string;
  teamId?: string;
}

export interface Team {
  id: string;
  name: string;
  receiverMemberId?: string;
}

export interface ExpenseSplit {
  memberId: string;
  shareAmountCents: number;
}

export interface Expense {
  id: string;
  payerMemberId: string;
  amountCents: number;
  splits: ExpenseSplit[];
}

export interface MemberBalance {
  memberId: string;
  paidCents: number;
  owedCents: number;
  balanceCents: number;
}

export interface Transfer {
  fromId: string;
  toId: string;
  amountCents: number;
}

export interface TeamBalance {
  teamId: string;
  balanceCents: number;
}
