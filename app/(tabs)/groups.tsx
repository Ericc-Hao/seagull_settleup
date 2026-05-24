import { router } from 'expo-router';
import { View } from 'react-native';

import { buildGroupCards } from '../../src/data/mockData';
import { GROUPS_TAB_MOCK } from '../../src/data/groupsTabMock';
import {
  ScreenLayout,
  SplitGroupCard,
  SummaryOverviewCard,
  TabPageHeader,
} from '../../src/components';
import { layout } from '../../src/theme';

export default function GroupsTabScreen() {
  const groups = buildGroupCards('A');

  return (
    <ScreenLayout
      header={
        <TabPageHeader
          variant="tab"
          title={GROUPS_TAB_MOCK.title}
          subtitle={GROUPS_TAB_MOCK.subtitle}
        />
      }
    >
      <SummaryOverviewCard
        title={GROUPS_TAB_MOCK.summary.title}
        primaryLabel={GROUPS_TAB_MOCK.summary.primaryLabel}
        primaryValue={GROUPS_TAB_MOCK.summary.primaryValue}
        stats={GROUPS_TAB_MOCK.summary.stats}
        showMascot={false}
      />

      <View style={{ gap: layout.cardGap }}>
        {groups.map((group) => (
          <SplitGroupCard
            key={group.id}
            group={group}
            layout="full"
            onPress={() => router.push(`/group/${group.id}/settle-up`)}
          />
        ))}
      </View>
    </ScreenLayout>
  );
}
