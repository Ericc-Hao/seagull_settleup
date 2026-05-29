import type {
  Expense,
  ExpenseSplit,
  Group,
  GroupMember,
  Settlement,
} from '../../../types/models';
import type { DatabaseSnapshot } from '../../../storage/types';

export const SETTLEMENT_GROUP_ID = 'group-settlement-regression';

export const MEMBER_IDS = {
  eric: 'member-eric',
  alice: 'member-alice',
  bob: 'member-bob',
  pendingCharlie: 'member-pending-charlie',
} as const;

export const USER_IDS = {
  eric: 'user-eric',
  alice: 'user-alice',
  bob: 'user-bob',
} as const;

export const FIXTURE_TIMESTAMP = '2026-05-29T00:00:00.000Z';

const FIXTURE_TIMESTAMP_INTERNAL = FIXTURE_TIMESTAMP;

export interface TransferExpectation {
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
}

export function normalizeTransfers(transfers: TransferExpectation[]): TransferExpectation[] {
  return transfers
    .map((transfer) => ({
      fromMemberId: transfer.fromMemberId,
      toMemberId: transfer.toMemberId,
      amountCents: transfer.amountCents,
    }))
    .sort((a, b) =>
      `${a.fromMemberId}-${a.toMemberId}-${a.amountCents}`.localeCompare(
        `${b.fromMemberId}-${b.toMemberId}-${b.amountCents}`,
      ),
    );
}

export function createGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: SETTLEMENT_GROUP_ID,
    name: 'Settlement Regression Group',
    type: 'Trip',
    currency: 'CAD',
    startDate: '2026-05-01',
    settlementMode: 'individual',
    status: 'active',
    ownerId: USER_IDS.eric,
    createdAt: FIXTURE_TIMESTAMP_INTERNAL,
    updatedAt: FIXTURE_TIMESTAMP_INTERNAL,
    ...overrides,
  };
}

export function createMember(
  memberKey: keyof typeof MEMBER_IDS,
  displayName: string,
  options: {
    userId?: string;
    email?: string;
    role?: string;
    invitationStatus?: GroupMember['invitationStatus'];
    isActive?: boolean;
  } = {},
): GroupMember {
  const id = MEMBER_IDS[memberKey];
  const defaultUserId =
    memberKey === 'pendingCharlie' ? undefined : USER_IDS[memberKey as keyof typeof USER_IDS];

  return {
    id,
    groupId: SETTLEMENT_GROUP_ID,
    userId: options.userId ?? defaultUserId,
    email: options.email ?? `${memberKey}@example.com`,
    displayName,
    nickname: displayName,
    role: options.role ?? (memberKey === 'eric' ? 'owner' : 'member'),
    invitationStatus: options.invitationStatus ?? 'active',
    isActive: options.isActive ?? options.invitationStatus !== 'pending',
    createdAt: FIXTURE_TIMESTAMP_INTERNAL,
    updatedAt: FIXTURE_TIMESTAMP_INTERNAL,
  };
}

export function createExpense(
  id: string,
  payerMemberId: string,
  amountCents: number,
  options: {
    deletedAt?: string;
    description?: string;
    userId?: string;
  } = {},
): Expense {
  return {
    id,
    groupId: SETTLEMENT_GROUP_ID,
    type: 'split',
    payerMemberId,
    userId: options.userId ?? USER_IDS.eric,
    amountCents,
    currency: 'CAD',
    category: 'Food',
    description: options.description ?? id,
    expenseDate: FIXTURE_TIMESTAMP,
    splitMethod: 'equal',
    deletedAt: options.deletedAt,
    createdAt: FIXTURE_TIMESTAMP_INTERNAL,
    updatedAt: FIXTURE_TIMESTAMP_INTERNAL,
  };
}

export function createSplit(
  expenseId: string,
  memberId: string,
  shareAmountCents: number,
  id?: string,
): ExpenseSplit {
  return {
    id: id ?? `split-${expenseId}-${memberId}`,
    expenseId,
    memberId,
    shareAmountCents,
    createdAt: FIXTURE_TIMESTAMP_INTERNAL,
    updatedAt: FIXTURE_TIMESTAMP_INTERNAL,
  };
}

export function createSettlementRecord(
  id: string,
  fromMemberId: string,
  toMemberId: string,
  amountCents: number,
  options: {
    status?: Settlement['status'];
    mode?: Settlement['mode'];
    metadata?: Settlement['metadata'];
  } = {},
): Settlement {
  return {
    id,
    groupId: SETTLEMENT_GROUP_ID,
    mode: options.mode ?? 'individual',
    fromMemberId,
    toMemberId,
    amountCents,
    currency: 'CAD',
    status: options.status ?? 'paid',
    paidAt: FIXTURE_TIMESTAMP,
    metadata: options.metadata,
    createdAt: FIXTURE_TIMESTAMP_INTERNAL,
    updatedAt: FIXTURE_TIMESTAMP_INTERNAL,
  };
}

export function buildSettlementSnapshot(input: {
  members: GroupMember[];
  expenses: Expense[];
  expenseSplits: ExpenseSplit[];
  settlements?: Settlement[];
  group?: Partial<Group>;
}): DatabaseSnapshot {
  return {
    users: [],
    profiles: [],
    groups: [createGroup(input.group)],
    groupInvitations: [],
    groupMembers: input.members.map((member) => ({ ...member, groupId: SETTLEMENT_GROUP_ID })),
    teams: [],
    teamMembers: [],
    expenses: input.expenses,
    expenseSplits: input.expenseSplits,
    settlements: input.settlements ?? [],
    receipts: [],
    categories: [],
  };
}

export function balanceMap(balances: Array<{ memberId: string; balanceCents: number }>): Map<string, number> {
  return new Map(balances.map((entry) => [entry.memberId, entry.balanceCents]));
}
