import { router } from 'expo-router';
import { View } from 'react-native';

import { EXPENSES_TAB_MOCK } from '../../src/data/expensesTabMock';
import {
  ScreenLayout,
  SectionCard,
  SectionRow,
  SectionTitle,
  SummaryOverviewCard,
  TabPageHeader,
} from '../../src/components';
import { layout } from '../../src/theme';

export default function ExpensesTabScreen() {
  return (
    <ScreenLayout
      header={
        <TabPageHeader
          variant="tab"
          title={EXPENSES_TAB_MOCK.title}
          subtitle={EXPENSES_TAB_MOCK.subtitle}
        />
      }
    >
      <SummaryOverviewCard
        title={EXPENSES_TAB_MOCK.summary.title}
        primaryLabel={EXPENSES_TAB_MOCK.summary.primaryLabel}
        primaryValue={EXPENSES_TAB_MOCK.summary.primaryValue}
        stats={EXPENSES_TAB_MOCK.summary.stats}
        showMascot={false}
      />

      <View style={{ gap: layout.cardGap }}>
        <SectionTitle title="Personal Expenses" />
        <SectionCard>
          {EXPENSES_TAB_MOCK.personal.map((expense, index) => (
            <SectionRow
              key={expense.id}
              icon={expense.icon}
              iconTint={expense.tint}
              iconBg={expense.bg}
              label={expense.label}
              value={expense.amount}
              showDivider={index < EXPENSES_TAB_MOCK.personal.length - 1}
              showChevron={false}
            />
          ))}
        </SectionCard>
      </View>

      <View style={{ gap: layout.cardGap }}>
        <SectionTitle title="Split Expenses" />
        <SectionCard>
          {EXPENSES_TAB_MOCK.split.map((expense, index) => (
            <SectionRow
              key={expense.id}
              icon={expense.icon}
              iconTint={expense.tint}
              iconBg={expense.bg}
              label={expense.label}
              subtitle={expense.group}
              value={expense.amount}
              onPress={() => router.push('/group/group-banff/add-expense')}
              showDivider={index < EXPENSES_TAB_MOCK.split.length - 1}
            />
          ))}
        </SectionCard>
      </View>
    </ScreenLayout>
  );
}
