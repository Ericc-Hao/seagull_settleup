import { describe, expect, it } from 'vitest';

import {
  buildEqualSplits,
  calculateMemberBalances,
  calculateTeamBalances,
  GroupMember,
  optimizeTransfers,
  Team,
} from '../index';

const members: GroupMember[] = [
  { id: 'A', displayName: 'A', teamId: 'AC' },
  { id: 'B', displayName: 'B', teamId: 'BD' },
  { id: 'C', displayName: 'C', teamId: 'AC' },
  { id: 'D', displayName: 'D', teamId: 'BD' },
];

const teams: Team[] = [
  { id: 'AC', name: 'AC Couple', receiverMemberId: 'A' },
  { id: 'BD', name: 'BD Couple', receiverMemberId: 'B' },
];

describe('settlement core', () => {
  it('calculates member balances for the Banff example', () => {
    const expenses = [
      { id: 'e1', payerMemberId: 'A', amountCents: 200000, splits: buildEqualSplits(['A', 'B', 'C', 'D'], 200000) },
      { id: 'e2', payerMemberId: 'B', amountCents: 90000, splits: buildEqualSplits(['A', 'B', 'C', 'D'], 90000) },
    ];

    const balances = calculateMemberBalances(members, expenses);
    const byMember = new Map(balances.map((entry) => [entry.memberId, entry]));

    expect(byMember.get('A')).toMatchObject({ paidCents: 200000, owedCents: 72500, balanceCents: 127500 });
    expect(byMember.get('B')).toMatchObject({ paidCents: 90000, owedCents: 72500, balanceCents: 17500 });
    expect(byMember.get('C')).toMatchObject({ paidCents: 0, owedCents: 72500, balanceCents: -72500 });
    expect(byMember.get('D')).toMatchObject({ paidCents: 0, owedCents: 72500, balanceCents: -72500 });
  });

  it('generates optimized individual transfers for the Banff example', () => {
    const transfers = optimizeTransfers([
      { id: 'A', balanceCents: 127500 },
      { id: 'B', balanceCents: 17500 },
      { id: 'C', balanceCents: -72500 },
      { id: 'D', balanceCents: -72500 },
    ]);

    expect(transfers).toEqual([
      { fromId: 'C', toId: 'A', amountCents: 72500 },
      { fromId: 'D', toId: 'A', amountCents: 55000 },
      { fromId: 'D', toId: 'B', amountCents: 17500 },
    ]);
  });

  it('merges member balances into team-level settlement', () => {
    const memberBalances = [
      { memberId: 'A', paidCents: 200000, owedCents: 72500, balanceCents: 127500 },
      { memberId: 'B', paidCents: 90000, owedCents: 72500, balanceCents: 17500 },
      { memberId: 'C', paidCents: 0, owedCents: 72500, balanceCents: -72500 },
      { memberId: 'D', paidCents: 0, owedCents: 72500, balanceCents: -72500 },
    ];

    const teamBalances = calculateTeamBalances(members, teams, memberBalances);
    const transfers = optimizeTransfers(teamBalances.map((entry) => ({ id: entry.teamId, balanceCents: entry.balanceCents })));

    expect(transfers).toEqual([{ fromId: 'BD', toId: 'AC', amountCents: 55000 }]);
  });

  it('splits remainder cents deterministically for equal split', () => {
    const splits = buildEqualSplits(['A', 'B', 'C'], 100);

    expect(splits).toEqual([
      { memberId: 'A', shareAmountCents: 34 },
      { memberId: 'B', shareAmountCents: 33 },
      { memberId: 'C', shareAmountCents: 33 },
    ]);
  });
});
