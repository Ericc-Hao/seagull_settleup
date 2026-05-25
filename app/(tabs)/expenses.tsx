import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import {
  EmptyStateCard,
  ScreenLayout,
  SectionCard,
  SectionRow,
  SectionTitle,
  SummaryOverviewCard,
  TabPageHeader,
} from '../../src/components';
import { SplitExpenseCard } from '../../src/components/expenses/SplitExpenseCard';
import { EXPENSE_FILTER_OPTIONS } from '../../src/data/constants';
import { useExpensesData } from '../../src/hooks/useExpensesData';
import { useNotifications } from '../../src/context/NotificationsContext';
import { colors, layout, typography } from '../../src/theme';

export default function ExpensesTabScreen() {
  const { filter, setFilter, isEmpty, ...data } = useExpensesData();
  const { unreadCount } = useNotifications();
  const showPersonal = filter === 'all' || filter === 'personal';
  const showSplit = filter === 'all' || filter === 'split';
  const personalItems = data.personal;
  const splitItems = data.split;

  return (
    <ScreenLayout
      header={
        <TabPageHeader
          title={data.title}
          subtitle={data.subtitle}
          unreadCount={unreadCount}
          onNotificationPress={() => router.push('/notifications')}
        />
      }
    >
      <SummaryOverviewCard
        title={data.summary.title}
        primaryLabel={data.summary.primaryLabel}
        primaryValue={data.summary.primaryValue}
        stats={data.summary.stats}
        showMascot={false}
      />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {EXPENSE_FILTER_OPTIONS.map((item) => {
          const active = filter === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setFilter(item.id)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: active ? colors.primary : colors.white,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.tertiary,
              }}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    textAlign: 'center',
                    fontWeight: '600',
                    color: active ? colors.white : colors.textSecondary,
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showPersonal && personalItems.length > 0 ? (
        <View style={{ gap: layout.cardGap }}>
          <SectionTitle title="Personal Expenses" />
          <SectionCard>
            {personalItems.map((expense, index) => (
              <SectionRow
                key={expense.id}
                categoryKey={expense.categoryKey}
                categoryName={expense.categoryName}
                categoryId={expense.categoryId}
                label={expense.label}
                value={expense.amount}
                onPress={() => router.push(`/expense/${expense.id}`)}
                showDivider={index < personalItems.length - 1}
              />
            ))}
          </SectionCard>
        </View>
      ) : null}

      {showSplit && splitItems.length > 0 ? (
        <View style={{ gap: layout.cardGap }}>
          <SectionTitle title="Split Expenses" />
          <SectionCard>
            {splitItems.map((expense, index) => (
              <SplitExpenseCard
                key={expense.expenseId}
                expenseId={expense.expenseId}
                title={expense.title}
                categoryName={expense.categoryName}
                categoryKey={expense.categoryKey}
                categoryId={expense.categoryId}
                groupName={expense.groupName}
                totalAmountCents={expense.totalAmountCents}
                myShareAmountCents={expense.myShareAmountCents}
                settlementStatus={expense.settlementStatus}
                includedInSplit={expense.includedInSplit}
                variant="expenses-tab"
                showDivider={index < splitItems.length - 1}
                onPress={(expenseId) => router.push(`/expense/${expenseId}`)}
              />
            ))}
          </SectionCard>
        </View>
      ) : null}

      {isEmpty ? (
        <EmptyStateCard
          title="No expenses yet"
          message="Add your first transaction to start building your monthly overview."
          ctaLabel="Add Expense"
          ctaIcon="document-plus"
          onPress={() => router.push('/add-expense')}
        />
      ) : null}
    </ScreenLayout>
  );
}
