import { QUICK_ACTIONS } from '../data/constants';
import type {
  CategoryRowView,
  HomeOverviewView,
  SplitGroupCardView,
} from '../types/views';
import { getCategoryConfig, normalizeCategoryKey } from '../utils/category';
import { formatMonthYearOverview, isInCurrentMonth } from '../utils/date';
import { addCents, formatCAD } from '../utils/money';
import { findMemberForUser, getExpenseSplits, getGroupExpenses, readDb } from './dbHelpers';
import { getAccessibleGroupsForUser, buildGroupCards, getCurrentUserId } from './groupService';
import { getPersonalExpenses } from './expenseService';
import { getCurrentUserGroupBalanceSummary } from './settlementService';

export function getHomeOverview(userId: string = getCurrentUserId()): HomeOverviewView {
  const db = readDb();
  const personal = getPersonalExpenses(userId).filter((expense) =>
    isInCurrentMonth(expense.expenseDate),
  );
  const personalTotal = addCents(personal.map((expense) => expense.amountCents));

  let youOwedCents = 0;
  let youOweCents = 0;
  let splitShareCents = 0;

  for (const group of getAccessibleGroupsForUser(userId)) {
    const member = findMemberForUser(group.id, userId, db);
    if (member) {
      for (const expense of getGroupExpenses(group.id, db)) {
        const split = getExpenseSplits(expense.id, db).find((entry) => entry.memberId === member.id);
        if (split && isInCurrentMonth(expense.expenseDate)) {
          splitShareCents += split.shareAmountCents;
        }
      }
    }

    const balanceSummary = getCurrentUserGroupBalanceSummary(group.id, userId);
    const balance = balanceSummary.adjustedBalanceCents;
    if (balance > 0) {
      youOwedCents += balance;
    } else if (balance < 0) {
      youOweCents += Math.abs(balance);
    }
  }

  const totalSpentCents = personalTotal + splitShareCents;

  return {
    monthLabel: formatMonthYearOverview(),
    totalSpentCents,
    youOwedCents,
    youOweCents,
  };
}

export function getHomeBookkeeping(userId: string = getCurrentUserId()): CategoryRowView[] {
  const map = new Map<string, number>();

  for (const expense of getPersonalExpenses(userId)) {
    if (!isInCurrentMonth(expense.expenseDate)) {
      continue;
    }
    map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amountCents);
  }

  return Array.from(map.entries())
    .map(([categoryName, amountCents]) => {
      const config = getCategoryConfig({ categoryName });
      return {
        id: normalizeCategoryKey(categoryName),
        label: config.label,
        amountCents,
        icon: config.icon,
        tint: config.tint,
        bg: config.bg,
        categoryKey: config.key,
        categoryName: config.label,
      };
    })
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 4)
    .map((row) => ({
      ...row,
      label: row.label,
    }));
}

export function getHomeSplitGroups(userId: string = getCurrentUserId()): SplitGroupCardView[] {
  return buildGroupCards(userId)
    .slice(0, 2)
    .map((card) => ({
      id: card.id,
      name: card.name,
      balance: card.balanceLabel || `Total ${formatCAD(card.totalSpentCents)}`,
      positive: card.balancePositive,
    }));
}

export function getQuickActions() {
  return QUICK_ACTIONS;
}
