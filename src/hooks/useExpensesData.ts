import { useMemo, useState } from 'react';

import { useAppData } from '../context/AppDataContext';
import { UI_COPY } from '../data/constants';
import { getExpensesSummary, listExpenseItems, listSplitExpenseCardItems } from '../services/expenseService';
import { formatCAD } from '../utils/money';

export type ExpenseFilter = 'all' | 'personal' | 'split';

export function useExpensesData() {
  const { versions } = useAppData();
  const [filter, setFilter] = useState<ExpenseFilter>('all');

  const data = useMemo(() => {
    const summary = getExpensesSummary();
    const personal = listExpenseItems('personal');
    const split = listSplitExpenseCardItems();
    const isEmpty =
      filter === 'all'
        ? personal.length === 0 && split.length === 0
        : filter === 'personal'
          ? personal.length === 0
          : split.length === 0;

    return {
      title: UI_COPY.expensesTitle,
      subtitle: UI_COPY.expensesSubtitle,
      summary: {
        title: summary.monthLabel,
        primaryLabel: 'Total Spent',
        primaryValue: formatCAD(summary.totalSpentCents),
        stats: [
          { label: 'Personal', value: formatCAD(summary.personalTotalCents), tone: 'default' as const },
          { label: 'Split your share', value: formatCAD(summary.splitShareCents), tone: 'default' as const },
        ],
      },
      personal,
      split,
      isEmpty,
    };
  }, [versions.expenses, filter]);

  return { ...data, filter, setFilter };
}
