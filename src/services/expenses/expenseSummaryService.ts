import type {
  CurrentUserMonthlyExpenseSummary,
  ExpensesSummaryView,
  SplitExpenseWithMyShare,
} from '../../types/views';
import { isInMonth, formatMonthYearOverview } from '../../utils/date';
import { addCents } from '../../utils/money';
import { readDb } from '../dbHelpers';
import { getCurrentUserId } from '../groupService';
import { toSplitExpenseWithMyShare } from './expenseReadService';

export function getCurrentUserMonthlyExpenseSummary(
  month: Date = new Date(),
  userId: string = getCurrentUserId(),
): CurrentUserMonthlyExpenseSummary {
  const db = readDb();
  const monthExpenses = db.expenses.filter(
    (expense) => !expense.deletedAt && isInMonth(expense.expenseDate, month),
  );
  const personalExpenses = monthExpenses.filter(
    (expense) => expense.type === 'personal' && expense.userId === userId,
  );
  const personalTotalCents = addCents(personalExpenses.map((expense) => expense.amountCents));
  const splitExpenses = monthExpenses
    .filter((expense) => expense.type === 'split')
    .map((expense) => toSplitExpenseWithMyShare(expense, userId, db))
    .filter((expense): expense is SplitExpenseWithMyShare => Boolean(expense));
  const splitShareTotalCents = addCents(splitExpenses.map((expense) => expense.myShareAmountCents));

  return {
    personalTotalCents,
    splitShareTotalCents,
    totalSpentCents: personalTotalCents + splitShareTotalCents,
    personalExpenses,
    splitExpenses,
  };
}

export function getExpensesSummary(userId: string = getCurrentUserId()): ExpensesSummaryView {
  const summary = getCurrentUserMonthlyExpenseSummary(new Date(), userId);
  return {
    monthLabel: formatMonthYearOverview(),
    totalSpentCents: summary.totalSpentCents,
    personalTotalCents: summary.personalTotalCents,
    splitShareCents: summary.splitShareTotalCents,
  };
}
