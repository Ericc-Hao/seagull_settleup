import { beforeEach, describe, expect, it } from 'vitest';

import { setCachedUserId } from '../../lib/auth';
import { setCache } from '../../lib/dataCache';
import {
  applyPaidSettlements,
  calculateGroupBalances,
  calculateIndividualPendingTransfersForCurrentUser,
  calculateTeamSettlementPreview,
  generateOptimizedTransfers,
  getSettlementHistory,
} from '../settlementService';
import {
  MEMBER_IDS,
  SETTLEMENT_GROUP_ID,
  USER_IDS,
  buildSettlementSnapshot,
  createExpense,
  createMember,
  createSettlementRecord,
  createSplit,
  FIXTURE_TIMESTAMP,
  normalizeTransfers,
} from './fixtures/settlementFixtures';

function expectBalance(
  balances: Array<{ memberId: string; balanceCents: number }>,
  memberId: string,
  balanceCents: number,
): void {
  const map = new Map(balances.map((entry) => [entry.memberId, entry.balanceCents]));
  expect(map.get(memberId)).toBe(balanceCents);
}

const GROUP_ID = SETTLEMENT_GROUP_ID;

function pendingTransfersFor(userId: keyof typeof USER_IDS) {
  return calculateIndividualPendingTransfersForCurrentUser(GROUP_ID, USER_IDS[userId]).map((transfer) => ({
    fromMemberId: transfer.fromMemberId!,
    toMemberId: transfer.toMemberId!,
    amountCents: transfer.amountCents,
  }));
}

function optimizedPendingTransfers() {
  const raw = calculateGroupBalances(GROUP_ID);
  const adjusted = applyPaidSettlements(GROUP_ID, raw);
  return normalizeTransfers(
    generateOptimizedTransfers(adjusted).map((transfer) => ({
      fromMemberId: transfer.fromId,
      toMemberId: transfer.toId,
      amountCents: transfer.amountCents,
    })),
  );
}

describe('settlement regression', () => {
  describe('calculates a two-person equal split', () => {
    beforeEach(() => {
      setCache(
        buildSettlementSnapshot({
          members: [createMember('eric', 'Eric'), createMember('alice', 'Alice')],
          expenses: [createExpense('expense-two-person', MEMBER_IDS.eric, 10000)],
          expenseSplits: [
            createSplit('expense-two-person', MEMBER_IDS.eric, 5000),
            createSplit('expense-two-person', MEMBER_IDS.alice, 5000),
          ],
        }),
      );
      setCachedUserId(USER_IDS.alice);
    });

    it('balances Eric as creditor and Alice as debtor', () => {
      const balances = calculateGroupBalances(GROUP_ID);
      expectBalance(balances, MEMBER_IDS.eric, 5000);
      expectBalance(balances, MEMBER_IDS.alice, -5000);
    });

    it('generates Alice owes Eric transfer', () => {
      expect(optimizedPendingTransfers()).toEqual(
        normalizeTransfers([
          { fromMemberId: MEMBER_IDS.alice, toMemberId: MEMBER_IDS.eric, amountCents: 5000 },
        ]),
      );
    });

    it('shows Alice outgoing pending transfer to Eric', () => {
      expect(normalizeTransfers(pendingTransfersFor('alice'))).toEqual(
        normalizeTransfers([
          { fromMemberId: MEMBER_IDS.alice, toMemberId: MEMBER_IDS.eric, amountCents: 5000 },
        ]),
      );
    });
  });

  describe('calculates a three-person equal split', () => {
    beforeEach(() => {
      setCache(
        buildSettlementSnapshot({
          members: [
            createMember('eric', 'Eric'),
            createMember('alice', 'Alice'),
            createMember('bob', 'Bob'),
          ],
          expenses: [createExpense('expense-three-person', MEMBER_IDS.eric, 9000)],
          expenseSplits: [
            createSplit('expense-three-person', MEMBER_IDS.eric, 3000),
            createSplit('expense-three-person', MEMBER_IDS.alice, 3000),
            createSplit('expense-three-person', MEMBER_IDS.bob, 3000),
          ],
        }),
      );
    });

    it('balances Eric as creditor for both Alice and Bob shares', () => {
      const balances = calculateGroupBalances(GROUP_ID);
      expectBalance(balances, MEMBER_IDS.eric, 6000);
      expectBalance(balances, MEMBER_IDS.alice, -3000);
      expectBalance(balances, MEMBER_IDS.bob, -3000);
    });

    it('generates Alice and Bob transfers to Eric', () => {
      expect(optimizedPendingTransfers()).toEqual(
        normalizeTransfers([
          { fromMemberId: MEMBER_IDS.alice, toMemberId: MEMBER_IDS.eric, amountCents: 3000 },
          { fromMemberId: MEMBER_IDS.bob, toMemberId: MEMBER_IDS.eric, amountCents: 3000 },
        ]),
      );
    });
  });

  describe('nets multiple payers into minimized transfers', () => {
    beforeEach(() => {
      setCache(
        buildSettlementSnapshot({
          members: [
            createMember('eric', 'Eric'),
            createMember('alice', 'Alice'),
            createMember('bob', 'Bob'),
          ],
          expenses: [
            createExpense('expense-eric-paid', MEMBER_IDS.eric, 9000),
            createExpense('expense-alice-paid', MEMBER_IDS.alice, 6000, { userId: USER_IDS.alice }),
          ],
          expenseSplits: [
            createSplit('expense-eric-paid', MEMBER_IDS.eric, 3000),
            createSplit('expense-eric-paid', MEMBER_IDS.alice, 3000),
            createSplit('expense-eric-paid', MEMBER_IDS.bob, 3000),
            createSplit('expense-alice-paid', MEMBER_IDS.eric, 2000),
            createSplit('expense-alice-paid', MEMBER_IDS.alice, 2000),
            createSplit('expense-alice-paid', MEMBER_IDS.bob, 2000),
          ],
        }),
      );
    });

    it('produces net balances after multiple payers', () => {
      const balances = calculateGroupBalances(GROUP_ID);
      expectBalance(balances, MEMBER_IDS.eric, 4000);
      expectBalance(balances, MEMBER_IDS.alice, 1000);
      expectBalance(balances, MEMBER_IDS.bob, -5000);
    });

    it('optimizes Bob paying Eric and Alice after netting', () => {
      expect(optimizedPendingTransfers()).toEqual(
        normalizeTransfers([
          { fromMemberId: MEMBER_IDS.bob, toMemberId: MEMBER_IDS.eric, amountCents: 4000 },
          { fromMemberId: MEMBER_IDS.bob, toMemberId: MEMBER_IDS.alice, amountCents: 1000 },
        ]),
      );
    });
  });

  describe('calculates payer-paid-for-someone-else split', () => {
    beforeEach(() => {
      setCache(
        buildSettlementSnapshot({
          members: [createMember('eric', 'Eric'), createMember('alice', 'Alice')],
          expenses: [createExpense('expense-alice-only', MEMBER_IDS.eric, 10000)],
          expenseSplits: [createSplit('expense-alice-only', MEMBER_IDS.alice, 10000)],
        }),
      );
    });

    it('does not create self-transfer for payer excluded from split', () => {
      const balances = calculateGroupBalances(GROUP_ID);
      expectBalance(balances, MEMBER_IDS.eric, 10000);
      expectBalance(balances, MEMBER_IDS.alice, -10000);

      expect(optimizedPendingTransfers()).toEqual(
        normalizeTransfers([
          { fromMemberId: MEMBER_IDS.alice, toMemberId: MEMBER_IDS.eric, amountCents: 10000 },
        ]),
      );
      expect(optimizedPendingTransfers().some((transfer) => transfer.fromMemberId === transfer.toMemberId)).toBe(
        false,
      );
    });
  });

  describe('includes pending invited members in balances', () => {
    beforeEach(() => {
      setCache(
        buildSettlementSnapshot({
          members: [
            createMember('eric', 'Eric'),
            createMember('alice', 'Alice'),
            createMember('pendingCharlie', 'Charlie', {
              invitationStatus: 'pending',
              isActive: false,
              userId: undefined,
            }),
          ],
          expenses: [createExpense('expense-with-pending', MEMBER_IDS.eric, 9000)],
          expenseSplits: [
            createSplit('expense-with-pending', MEMBER_IDS.eric, 3000),
            createSplit('expense-with-pending', MEMBER_IDS.alice, 3000),
            createSplit('expense-with-pending', MEMBER_IDS.pendingCharlie, 3000),
          ],
        }),
      );
    });

    it('treats pending Charlie like a normal participant for balances', () => {
      const balances = calculateGroupBalances(GROUP_ID);
      expectBalance(balances, MEMBER_IDS.eric, 6000);
      expectBalance(balances, MEMBER_IDS.alice, -3000);
      expectBalance(balances, MEMBER_IDS.pendingCharlie, -3000);
    });

    it('includes pending Charlie in optimized transfers', () => {
      expect(optimizedPendingTransfers()).toEqual(
        normalizeTransfers([
          { fromMemberId: MEMBER_IDS.alice, toMemberId: MEMBER_IDS.eric, amountCents: 3000 },
          { fromMemberId: MEMBER_IDS.pendingCharlie, toMemberId: MEMBER_IDS.eric, amountCents: 3000 },
        ]),
      );
    });
  });

  describe('ignores deleted expenses', () => {
    beforeEach(() => {
      setCache(
        buildSettlementSnapshot({
          members: [createMember('eric', 'Eric'), createMember('alice', 'Alice')],
          expenses: [
            createExpense('expense-active', MEMBER_IDS.eric, 10000),
            createExpense('expense-deleted', MEMBER_IDS.alice, 10000, {
              deletedAt: FIXTURE_TIMESTAMP,
              userId: USER_IDS.alice,
            }),
          ],
          expenseSplits: [
            createSplit('expense-active', MEMBER_IDS.eric, 5000),
            createSplit('expense-active', MEMBER_IDS.alice, 5000),
            createSplit('expense-deleted', MEMBER_IDS.eric, 5000),
            createSplit('expense-deleted', MEMBER_IDS.alice, 5000),
          ],
        }),
      );
    });

    it('only applies active expense balances', () => {
      const balances = calculateGroupBalances(GROUP_ID);
      expectBalance(balances, MEMBER_IDS.eric, 5000);
      expectBalance(balances, MEMBER_IDS.alice, -5000);
    });
  });

  describe('subtracts confirmed settlements from pending transfers', () => {
    beforeEach(() => {
      setCache(
        buildSettlementSnapshot({
          members: [createMember('eric', 'Eric'), createMember('alice', 'Alice')],
          expenses: [createExpense('expense-settled', MEMBER_IDS.eric, 10000)],
          expenseSplits: [
            createSplit('expense-settled', MEMBER_IDS.eric, 5000),
            createSplit('expense-settled', MEMBER_IDS.alice, 5000),
          ],
          settlements: [
            createSettlementRecord(
              'settlement-full',
              MEMBER_IDS.alice,
              MEMBER_IDS.eric,
              5000,
              { status: 'paid' },
            ),
          ],
        }),
      );
      setCachedUserId(USER_IDS.alice);
    });

    it('removes fully settled pending transfer', () => {
      const adjusted = applyPaidSettlements(GROUP_ID, calculateGroupBalances(GROUP_ID));
      expectBalance(adjusted, MEMBER_IDS.alice, 0);
      expectBalance(adjusted, MEMBER_IDS.eric, 0);
      expect(pendingTransfersFor('alice')).toEqual([]);
    });

    it('keeps historical settlement records after payment', () => {
      const history = getSettlementHistory(GROUP_ID);
      expect(history).toHaveLength(1);
      expect(history[0].amountCents).toBe(5000);
      expect(history[0].status).toBe('paid');
      expect(history[0].fromLabel).toBe('Alice');
      expect(history[0].toLabel).toBe('Eric');
      expect(history[0].summary).toContain('Paid');
    });
  });

  describe('leaves remaining balance after partial settlement', () => {
    beforeEach(() => {
      setCache(
        buildSettlementSnapshot({
          members: [createMember('eric', 'Eric'), createMember('alice', 'Alice')],
          expenses: [createExpense('expense-partial', MEMBER_IDS.eric, 20000)],
          expenseSplits: [
            createSplit('expense-partial', MEMBER_IDS.eric, 10000),
            createSplit('expense-partial', MEMBER_IDS.alice, 10000),
          ],
          settlements: [
            createSettlementRecord(
              'settlement-partial',
              MEMBER_IDS.alice,
              MEMBER_IDS.eric,
              4000,
              { status: 'paid' },
            ),
          ],
        }),
      );
      setCachedUserId(USER_IDS.alice);
    });

    it('shows Alice still owes Eric after partial payment', () => {
      const adjusted = applyPaidSettlements(GROUP_ID, calculateGroupBalances(GROUP_ID));
      expectBalance(adjusted, MEMBER_IDS.alice, -6000);
      expectBalance(adjusted, MEMBER_IDS.eric, 6000);

      expect(normalizeTransfers(pendingTransfersFor('alice'))).toEqual(
        normalizeTransfers([
          { fromMemberId: MEMBER_IDS.alice, toMemberId: MEMBER_IDS.eric, amountCents: 6000 },
        ]),
      );
    });
  });

  describe('team settlement regression', () => {
    beforeEach(() => {
      setCache(
        buildSettlementSnapshot({
          members: [
            createMember('eric', 'Eric'),
            createMember('alice', 'Alice'),
            createMember('bob', 'Bob'),
          ],
          expenses: [
            createExpense('expense-team', MEMBER_IDS.bob, 9000, { userId: USER_IDS.bob }),
          ],
          expenseSplits: [
            createSplit('expense-team', MEMBER_IDS.eric, 3000),
            createSplit('expense-team', MEMBER_IDS.alice, 3000),
            createSplit('expense-team', MEMBER_IDS.bob, 3000),
          ],
        }),
      );
      setCachedUserId(USER_IDS.eric);
    });

    it('team preview covers Eric and Alice shared debt to Bob', () => {
      const preview = calculateTeamSettlementPreview(
        GROUP_ID,
        [MEMBER_IDS.eric, MEMBER_IDS.alice],
        USER_IDS.eric,
      );

      expect(preview).not.toBeNull();
      expect(preview?.amountCents).toBe(6000);
      expect(preview?.teamBalanceCents).toBe(-6000);
      expect(preview?.requiresPayment).toBe(true);
    });

    it('paid team settlement clears current user pending transfers and keeps history', () => {
      const preview = calculateTeamSettlementPreview(
        GROUP_ID,
        [MEMBER_IDS.eric, MEMBER_IDS.alice],
        USER_IDS.eric,
      );

      setCache(
        buildSettlementSnapshot({
          members: [
            createMember('eric', 'Eric'),
            createMember('alice', 'Alice'),
            createMember('bob', 'Bob'),
          ],
          expenses: [
            createExpense('expense-team', MEMBER_IDS.bob, 9000, { userId: USER_IDS.bob }),
          ],
          expenseSplits: [
            createSplit('expense-team', MEMBER_IDS.eric, 3000),
            createSplit('expense-team', MEMBER_IDS.alice, 3000),
            createSplit('expense-team', MEMBER_IDS.bob, 3000),
          ],
          settlements: [
            createSettlementRecord(
              'settlement-team-paid',
              MEMBER_IDS.eric,
              MEMBER_IDS.bob,
              6000,
              {
                status: 'paid',
                mode: 'team',
                metadata: {
                  settlementType: 'temporary_team',
                  paidByMemberId: MEMBER_IDS.eric,
                  paidByName: 'Eric',
                  teamMemberIds: [MEMBER_IDS.eric, MEMBER_IDS.alice],
                  teamMemberNames: ['Eric', 'Alice'],
                  coveredBalances: preview?.coveredBalances,
                  explanation: preview?.explanation,
                },
              },
            ),
          ],
        }),
      );

      expect(calculateIndividualPendingTransfersForCurrentUser(GROUP_ID, USER_IDS.eric)).toHaveLength(0);
      expect(calculateIndividualPendingTransfersForCurrentUser(GROUP_ID, USER_IDS.alice)).toHaveLength(0);

      const history = getSettlementHistory(GROUP_ID);
      expect(history).toHaveLength(1);
      expect(history[0].historyTitle).toBe('Team settlement');
      expect(history[0].amountCents).toBe(6000);
    });
  });

  describe('calculates historical balances for inactive groups', () => {
    beforeEach(() => {
      setCache(
        buildSettlementSnapshot({
          group: { status: 'inactive' },
          members: [createMember('eric', 'Eric'), createMember('alice', 'Alice')],
          expenses: [createExpense('expense-inactive-group', MEMBER_IDS.eric, 10000)],
          expenseSplits: [
            createSplit('expense-inactive-group', MEMBER_IDS.eric, 5000),
            createSplit('expense-inactive-group', MEMBER_IDS.alice, 5000),
          ],
        }),
      );
      setCachedUserId(USER_IDS.alice);
    });

    it('still calculates outstanding balances for inactive groups', () => {
      const balances = calculateGroupBalances(GROUP_ID);
      expectBalance(balances, MEMBER_IDS.eric, 5000);
      expectBalance(balances, MEMBER_IDS.alice, -5000);

      expect(normalizeTransfers(pendingTransfersFor('alice'))).toEqual(
        normalizeTransfers([
          { fromMemberId: MEMBER_IDS.alice, toMemberId: MEMBER_IDS.eric, amountCents: 5000 },
        ]),
      );
    });
  });
});
