import {
  Expense,
  ExpenseSplit,
  GroupMember,
  MemberBalance,
  Team,
  TeamBalance,
  Transfer,
} from './types';

const ZERO_CENTS = 0;

function assertNonNegativeInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer (cents).`);
  }
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer (cents).`);
  }
}

export function buildEqualSplits(memberIds: string[], totalAmountCents: number): ExpenseSplit[] {
  if (memberIds.length === 0) {
    throw new Error('Cannot split expense across zero members.');
  }

  assertPositiveInteger(totalAmountCents, 'totalAmountCents');
  const baseShare = Math.floor(totalAmountCents / memberIds.length);
  const remainder = totalAmountCents % memberIds.length;

  return memberIds.map((memberId, index) => ({
    memberId,
    shareAmountCents: baseShare + (index < remainder ? 1 : 0),
  }));
}

export function calculateMemberBalances(members: GroupMember[], expenses: Expense[]): MemberBalance[] {
  const memberIds = new Set(members.map((member) => member.id));
  const paidByMember = new Map<string, number>();
  const owedByMember = new Map<string, number>();

  for (const member of members) {
    paidByMember.set(member.id, ZERO_CENTS);
    owedByMember.set(member.id, ZERO_CENTS);
  }

  for (const expense of expenses) {
    assertPositiveInteger(expense.amountCents, `expense(${expense.id}).amountCents`);

    if (!memberIds.has(expense.payerMemberId)) {
      throw new Error(`expense(${expense.id}) payer is not part of group.`);
    }

    const currentPaid = paidByMember.get(expense.payerMemberId) ?? ZERO_CENTS;
    paidByMember.set(expense.payerMemberId, currentPaid + expense.amountCents);

    let splitTotal = ZERO_CENTS;
    for (const split of expense.splits) {
      assertNonNegativeInteger(
        split.shareAmountCents,
        `expense(${expense.id}).split(${split.memberId}).shareAmountCents`,
      );

      if (!memberIds.has(split.memberId)) {
        throw new Error(`expense(${expense.id}) split member ${split.memberId} is not part of group.`);
      }

      splitTotal += split.shareAmountCents;
      const currentOwed = owedByMember.get(split.memberId) ?? ZERO_CENTS;
      owedByMember.set(split.memberId, currentOwed + split.shareAmountCents);
    }

    if (splitTotal !== expense.amountCents) {
      throw new Error(
        `expense(${expense.id}) split total ${splitTotal} does not match amount ${expense.amountCents}.`,
      );
    }
  }

  return members.map((member) => {
    const paidCents = paidByMember.get(member.id) ?? ZERO_CENTS;
    const owedCents = owedByMember.get(member.id) ?? ZERO_CENTS;

    return {
      memberId: member.id,
      paidCents,
      owedCents,
      balanceCents: paidCents - owedCents,
    };
  });
}

export function optimizeTransfers(balances: { id: string; balanceCents: number }[]): Transfer[] {
  const creditors = balances
    .filter((entry) => entry.balanceCents > 0)
    .map((entry) => ({ id: entry.id, amountCents: entry.balanceCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const debtors = balances
    .filter((entry) => entry.balanceCents < 0)
    .map((entry) => ({ id: entry.id, amountCents: Math.abs(entry.balanceCents) }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const transfers: Transfer[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const transferAmount = Math.min(creditor.amountCents, debtor.amountCents);

    if (transferAmount <= 0) {
      throw new Error('Unexpected non-positive transfer amount during optimization.');
    }

    transfers.push({
      fromId: debtor.id,
      toId: creditor.id,
      amountCents: transferAmount,
    });

    creditor.amountCents -= transferAmount;
    debtor.amountCents -= transferAmount;

    if (creditor.amountCents === 0) {
      creditorIndex += 1;
    }

    if (debtor.amountCents === 0) {
      debtorIndex += 1;
    }
  }

  const residual = [
    ...creditors.slice(creditorIndex).map((c) => c.amountCents),
    ...debtors.slice(debtorIndex).map((d) => d.amountCents),
  ].reduce((sum, amount) => sum + amount, 0);

  if (residual !== 0) {
    throw new Error('Balance optimization did not settle to zero.');
  }

  return transfers;
}

export function calculateTeamBalances(
  members: GroupMember[],
  teams: Team[],
  memberBalances: MemberBalance[],
): TeamBalance[] {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const memberById = new Map(members.map((member) => [member.id, member]));
  const teamBalanceMap = new Map<string, number>();

  for (const balance of memberBalances) {
    const member = memberById.get(balance.memberId);
    if (!member) {
      throw new Error(`Balance references unknown member ${balance.memberId}.`);
    }

    const fallbackSoloTeamId = `solo:${member.id}`;
    const teamId = member.teamId ?? fallbackSoloTeamId;

    if (member.teamId && !teamById.has(member.teamId)) {
      throw new Error(`Member ${member.id} references unknown team ${member.teamId}.`);
    }

    const current = teamBalanceMap.get(teamId) ?? ZERO_CENTS;
    teamBalanceMap.set(teamId, current + balance.balanceCents);
  }

  return Array.from(teamBalanceMap.entries()).map(([teamId, balanceCents]) => ({
    teamId,
    balanceCents,
  }));
}
