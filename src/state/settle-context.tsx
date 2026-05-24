import { ReactNode, createContext, useContext, useMemo, useState } from 'react';

import {
  Expense,
  ExpenseSplit,
  GroupMember,
  Team,
  buildEqualSplits,
  calculateMemberBalances,
  calculateTeamBalances,
  optimizeTransfers,
} from '../core/settlement';

export type SplitMethod = 'equal' | 'custom';
type SettlementMode = 'individual' | 'team';

export interface MemberProfile extends GroupMember {
  emtName?: string;
  emtEmail?: string;
  emtPhone?: string;
}

export interface ExpenseRecord extends Expense {
  note: string;
  category: string;
  expenseDate: string;
  participantIds: string[];
  splitMethod: SplitMethod;
}

export interface TransferView {
  key: string;
  fromId: string;
  toId: string;
  amountCents: number;
  fromLabel: string;
  toLabel: string;
  toEmtEmail?: string;
  paid: boolean;
}

export interface CategorySummary {
  category: string;
  totalCents: number;
  expenseCount: number;
  ratio: number;
}

export interface MemberSummary {
  memberId: string;
  displayName: string;
  paidCents: number;
  owedCents: number;
  balanceCents: number;
  paidShareRatio: number;
}

export interface DashboardSummary {
  totalSpentCents: number;
  expenseCount: number;
  memberCount: number;
  averagePerMemberCents: number;
  pendingIndividualCount: number;
  pendingTeamCount: number;
  pendingIndividualCents: number;
  pendingTeamCents: number;
  individualProgressPercent: number;
  teamProgressPercent: number;
  categorySummary: CategorySummary[];
  memberSummary: MemberSummary[];
}

export interface AddExpenseInput {
  amountCents: number;
  payerMemberId: string;
  participantIds: string[];
  splitMethod: SplitMethod;
  customSharesCents?: Record<string, number>;
  category: string;
  note: string;
  expenseDate: string;
}

interface SettleContextValue {
  groupName: string;
  currency: 'CAD';
  activeMemberId: string;
  members: MemberProfile[];
  teams: Team[];
  expenses: ExpenseRecord[];
  memberBalances: ReturnType<typeof calculateMemberBalances>;
  individualTransfers: TransferView[];
  teamTransfers: TransferView[];
  dashboardSummary: DashboardSummary;
  addExpense: (input: AddExpenseInput) => void;
  toggleTransferPaid: (mode: SettlementMode, key: string) => void;
  updateMemberEmt: (memberId: string, patch: Pick<MemberProfile, 'emtName' | 'emtEmail' | 'emtPhone'>) => void;
}

const initialMembers: MemberProfile[] = [
  { id: 'A', displayName: 'Eric', teamId: 'AC', emtName: 'Eric Hao', emtEmail: 'eric@example.com', emtPhone: '647-111-2222' },
  { id: 'B', displayName: 'Ben', teamId: 'BD', emtName: 'Ben Lam', emtEmail: 'ben@example.com', emtPhone: '647-222-3333' },
  { id: 'C', displayName: 'Carol', teamId: 'AC', emtName: 'Carol Li', emtEmail: 'carol@example.com', emtPhone: '647-333-4444' },
  { id: 'D', displayName: 'Dylan', teamId: 'BD', emtName: 'Dylan Sun', emtEmail: 'dylan@example.com', emtPhone: '647-444-5555' },
];

const initialTeams: Team[] = [
  { id: 'AC', name: 'AC Couple', receiverMemberId: 'A' },
  { id: 'BD', name: 'BD Couple', receiverMemberId: 'B' },
];

const initialExpenses: ExpenseRecord[] = [
  {
    id: 'expense-1',
    payerMemberId: 'A',
    amountCents: 200000,
    splits: buildEqualSplits(['A', 'B', 'C', 'D'], 200000),
    participantIds: ['A', 'B', 'C', 'D'],
    splitMethod: 'equal',
    category: 'Hotel',
    note: 'Banff Hotel',
    expenseDate: '2026-05-24',
  },
  {
    id: 'expense-2',
    payerMemberId: 'B',
    amountCents: 90000,
    splits: buildEqualSplits(['A', 'B', 'C', 'D'], 90000),
    participantIds: ['A', 'B', 'C', 'D'],
    splitMethod: 'equal',
    category: 'Food',
    note: 'Group meals',
    expenseDate: '2026-05-24',
  },
];

const SettleContext = createContext<SettleContextValue | null>(null);

function buildCustomSplits(
  participantIds: string[],
  customSharesCents: Record<string, number>,
  amountCents: number,
): ExpenseSplit[] {
  if (participantIds.length === 0) {
    throw new Error('Select at least one participant.');
  }

  const splits = participantIds.map((memberId) => {
    const shareAmount = customSharesCents[memberId] ?? 0;
    if (!Number.isInteger(shareAmount) || shareAmount < 0) {
      throw new Error('Custom split values must be non-negative integer cents.');
    }
    return { memberId, shareAmountCents: shareAmount };
  });

  const total = splits.reduce((sum, split) => sum + split.shareAmountCents, 0);
  if (total !== amountCents) {
    throw new Error('Custom split total must equal expense amount.');
  }

  return splits;
}

function transferKey(fromId: string, toId: string, amountCents: number): string {
  return `${fromId}->${toId}:${amountCents}`;
}

export function SettleProvider({ children }: { children: ReactNode }) {
  const [activeMemberId] = useState('A');
  const [members, setMembers] = useState<MemberProfile[]>(initialMembers);
  const [teams] = useState<Team[]>(initialTeams);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialExpenses);
  const [paidIndividualKeys, setPaidIndividualKeys] = useState<string[]>([]);
  const [paidTeamKeys, setPaidTeamKeys] = useState<string[]>([]);

  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);

  const memberBalances = useMemo(() => calculateMemberBalances(members, expenses), [members, expenses]);

  const individualTransfers = useMemo<TransferView[]>(() => {
    const transfers = optimizeTransfers(
      memberBalances.map((entry) => ({
        id: entry.memberId,
        balanceCents: entry.balanceCents,
      })),
    );

    return transfers.map((transfer) => {
      const key = transferKey(transfer.fromId, transfer.toId, transfer.amountCents);
      const receiver = memberById.get(transfer.toId);
      return {
        key,
        fromId: transfer.fromId,
        toId: transfer.toId,
        amountCents: transfer.amountCents,
        fromLabel: memberById.get(transfer.fromId)?.displayName ?? transfer.fromId,
        toLabel: receiver?.displayName ?? transfer.toId,
        toEmtEmail: receiver?.emtEmail,
        paid: paidIndividualKeys.includes(key),
      };
    });
  }, [memberBalances, memberById, paidIndividualKeys]);

  const teamTransfers = useMemo<TransferView[]>(() => {
    const balances = calculateTeamBalances(members, teams, memberBalances);
    const transfers = optimizeTransfers(
      balances.map((entry) => ({
        id: entry.teamId,
        balanceCents: entry.balanceCents,
      })),
    );

    return transfers.map((transfer) => {
      const key = transferKey(transfer.fromId, transfer.toId, transfer.amountCents);
      const toTeam = teamById.get(transfer.toId);
      const receiverMemberId = toTeam?.receiverMemberId;
      const receiver = receiverMemberId ? memberById.get(receiverMemberId) : undefined;

      return {
        key,
        fromId: transfer.fromId,
        toId: transfer.toId,
        amountCents: transfer.amountCents,
        fromLabel: teamById.get(transfer.fromId)?.name ?? transfer.fromId,
        toLabel: teamById.get(transfer.toId)?.name ?? transfer.toId,
        toEmtEmail: receiver?.emtEmail,
        paid: paidTeamKeys.includes(key),
      };
    });
  }, [memberBalances, memberById, members, paidTeamKeys, teamById, teams]);

  const dashboardSummary = useMemo<DashboardSummary>(() => {
    const totalSpentCents = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
    const expenseCount = expenses.length;
    const memberCount = members.length;
    const averagePerMemberCents = memberCount > 0 ? Math.round(totalSpentCents / memberCount) : 0;

    const pendingIndividual = individualTransfers.filter((transfer) => !transfer.paid);
    const pendingTeam = teamTransfers.filter((transfer) => !transfer.paid);
    const pendingIndividualCents = pendingIndividual.reduce((sum, transfer) => sum + transfer.amountCents, 0);
    const pendingTeamCents = pendingTeam.reduce((sum, transfer) => sum + transfer.amountCents, 0);

    const individualProgressPercent =
      individualTransfers.length === 0
        ? 100
        : Math.round(((individualTransfers.length - pendingIndividual.length) / individualTransfers.length) * 100);
    const teamProgressPercent =
      teamTransfers.length === 0 ? 100 : Math.round(((teamTransfers.length - pendingTeam.length) / teamTransfers.length) * 100);

    const categoryMap = new Map<string, { totalCents: number; expenseCount: number }>();
    for (const expense of expenses) {
      const key = expense.category.trim() || 'Other';
      const current = categoryMap.get(key) ?? { totalCents: 0, expenseCount: 0 };
      categoryMap.set(key, {
        totalCents: current.totalCents + expense.amountCents,
        expenseCount: current.expenseCount + 1,
      });
    }

    const categorySummary = Array.from(categoryMap.entries())
      .map(([category, values]) => ({
        category,
        totalCents: values.totalCents,
        expenseCount: values.expenseCount,
        ratio: totalSpentCents === 0 ? 0 : values.totalCents / totalSpentCents,
      }))
      .sort((a, b) => b.totalCents - a.totalCents);

    const memberSummary = memberBalances
      .map((balance) => {
        const member = memberById.get(balance.memberId);
        return {
          memberId: balance.memberId,
          displayName: member?.displayName ?? balance.memberId,
          paidCents: balance.paidCents,
          owedCents: balance.owedCents,
          balanceCents: balance.balanceCents,
          paidShareRatio: totalSpentCents === 0 ? 0 : balance.paidCents / totalSpentCents,
        };
      })
      .sort((a, b) => b.balanceCents - a.balanceCents);

    return {
      totalSpentCents,
      expenseCount,
      memberCount,
      averagePerMemberCents,
      pendingIndividualCount: pendingIndividual.length,
      pendingTeamCount: pendingTeam.length,
      pendingIndividualCents,
      pendingTeamCents,
      individualProgressPercent,
      teamProgressPercent,
      categorySummary,
      memberSummary,
    };
  }, [expenses, individualTransfers, memberBalances, memberById, members.length, teamTransfers]);

  const addExpense = (input: AddExpenseInput) => {
    if (input.amountCents <= 0 || !Number.isInteger(input.amountCents)) {
      throw new Error('Amount must be positive.');
    }

    const participants = input.participantIds.filter(Boolean);
    const splits =
      input.splitMethod === 'equal'
        ? buildEqualSplits(participants, input.amountCents)
        : buildCustomSplits(participants, input.customSharesCents ?? {}, input.amountCents);

    const newExpense: ExpenseRecord = {
      id: `expense-${Date.now()}`,
      payerMemberId: input.payerMemberId,
      amountCents: input.amountCents,
      splits,
      participantIds: participants,
      splitMethod: input.splitMethod,
      category: input.category,
      note: input.note,
      expenseDate: input.expenseDate,
    };

    setExpenses((current) => [newExpense, ...current]);
  };

  const toggleTransferPaid = (mode: SettlementMode, key: string) => {
    const setter = mode === 'individual' ? setPaidIndividualKeys : setPaidTeamKeys;
    setter((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  };

  const updateMemberEmt = (memberId: string, patch: Pick<MemberProfile, 'emtName' | 'emtEmail' | 'emtPhone'>) => {
    setMembers((current) =>
      current.map((member) => (member.id === memberId ? { ...member, ...patch } : member)),
    );
  };

  return (
    <SettleContext.Provider
      value={{
        groupName: 'Banff Trip',
        currency: 'CAD',
        activeMemberId,
        members,
        teams,
        expenses,
        memberBalances,
        individualTransfers,
        teamTransfers,
        dashboardSummary,
        addExpense,
        toggleTransferPaid,
        updateMemberEmt,
      }}
    >
      {children}
    </SettleContext.Provider>
  );
}

export function useSettleContext(): SettleContextValue {
  const context = useContext(SettleContext);
  if (!context) {
    throw new Error('useSettleContext must be used inside SettleProvider.');
  }
  return context;
}

export function formatCad(amountCents: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amountCents / 100);
}
