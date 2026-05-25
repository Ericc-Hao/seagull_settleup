import { router } from 'expo-router';
import { View } from 'react-native';

import type { RecentGroupExpenseView } from '../../types/views';
import { layout } from '../../theme';
import { SplitExpenseCard } from '../expenses/SplitExpenseCard';
import { EmptyStateCard } from '../EmptyStateCard';
import { SectionCard, SectionTitle } from '../SectionCard';

export function GroupRecentExpenses({
  expenses,
  onAddExpense,
}: {
  expenses: RecentGroupExpenseView[];
  onAddExpense: () => void;
}) {
  if (expenses.length === 0) {
    return (
      <View style={{ gap: layout.cardGap }}>
        <SectionTitle title="Recent Expenses" />
        <EmptyStateCard
          title="No expenses yet"
          message="Add a shared expense to start tracking spending in this group."
          ctaLabel="Add Expense"
          ctaIcon="document-plus"
          onPress={onAddExpense}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: layout.cardGap }}>
      <SectionTitle title="Recent Expenses" />
      <SectionCard>
        {expenses.map((expense, index) => (
          <SplitExpenseCard
            key={expense.expenseId}
            expenseId={expense.expenseId}
            title={expense.title}
            categoryName={expense.categoryName}
            categoryKey={expense.categoryKey}
            categoryId={expense.categoryId}
            totalAmountCents={expense.totalAmountCents}
            myShareAmountCents={expense.myShareAmountCents}
            settlementStatus={expense.settlementStatus}
            includedInSplit={expense.includedInSplit}
            variant="group-detail"
            showDivider={index < expenses.length - 1}
            onPress={(expenseId) => router.push(`/expense/${expenseId}`)}
          />
        ))}
      </SectionCard>
    </View>
  );
}
