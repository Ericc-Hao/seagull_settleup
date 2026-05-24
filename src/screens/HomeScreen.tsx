import { router } from 'expo-router';
import { View } from 'react-native';

import { HOME_MOCK } from '../data/homeMock';
import {
  HomeSplitGroupCard,
  PrimaryButtonRow,
  QuickActionCard,
  ScreenLayout,
  SectionCard,
  SectionRow,
  SectionTitle,
  SummaryOverviewCard,
  TabPageHeader,
} from '../components';
import { layout } from '../theme';

export function HomeScreen() {
  const onQuickAction = (id: string) => {
    if (id === 'create') router.push('/create-group');
    if (id === 'settle') router.push('/group/group-banff/settle-up');
    if (id === 'personal') router.push('/group/group-banff/add-expense');
  };

  return (
    <ScreenLayout
      header={
        <TabPageHeader
          variant="home"
          greeting={HOME_MOCK.greeting}
          subtitle={HOME_MOCK.subtitle}
        />
      }
    >
      <SummaryOverviewCard
        title={HOME_MOCK.overview.title}
        primaryLabel="Total Spent"
        primaryValue={HOME_MOCK.overview.totalSpent}
        stats={[
          { label: 'You are owed', value: HOME_MOCK.overview.youOwed, tone: 'positive' },
          { label: 'You owe', value: HOME_MOCK.overview.youOwe, tone: 'negative' },
        ]}
      />

      <PrimaryButtonRow
        left={{
          label: 'Add Expense',
          icon: 'document-plus',
          onPress: () => router.push('/group/group-banff/add-expense'),
        }}
        right={{
          label: 'Split Bill',
          icon: 'users',
          onPress: () => router.push('/create-group'),
        }}
      />

      <View style={{ gap: layout.cardGap }}>
        <SectionTitle title="Quick Actions" />
        <View style={{ flexDirection: 'row', gap: layout.cardGap }}>
          {HOME_MOCK.quickActions.map((action) => (
            <QuickActionCard
              key={action.id}
              label={action.label}
              icon={action.icon}
              tint={action.tint}
              background={action.bg}
              onPress={() => onQuickAction(action.id)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: layout.cardGap }}>
        <SectionTitle title="Personal Bookkeeping" />
        <SectionCard>
          {HOME_MOCK.bookkeeping.map((row, index) => (
            <SectionRow
              key={row.id}
              icon={row.icon}
              iconTint={row.tint}
              iconBg={row.bg}
              label={row.label}
              value={row.amount}
              showDivider={index < HOME_MOCK.bookkeeping.length - 1}
              showChevron={false}
            />
          ))}
        </SectionCard>
      </View>

      <View style={{ gap: layout.cardGap }}>
        <SectionTitle title="Split Groups" actionLabel="View All" onAction={() => router.push('/(tabs)/groups')} />
        <View style={{ flexDirection: 'row', gap: layout.cardGap }}>
          {HOME_MOCK.splitGroups.map((group) => (
            <HomeSplitGroupCard
              key={group.id}
              name={group.name}
              balance={group.balance}
              positive={group.positive}
              gradient={group.gradient}
              onPress={() => router.push(`/group/${group.id}/settle-up`)}
            />
          ))}
        </View>
      </View>
    </ScreenLayout>
  );
}
