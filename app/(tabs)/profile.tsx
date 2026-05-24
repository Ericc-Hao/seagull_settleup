import { View } from 'react-native';

import { PROFILE_TAB_MOCK } from '../../src/data/profileTabMock';
import {
  ScreenLayout,
  SectionCard,
  SectionRow,
  SectionTitle,
  TabPageHeader,
} from '../../src/components';
import { layout } from '../../src/theme';

export default function ProfileScreen() {
  return (
    <ScreenLayout
      header={
        <TabPageHeader
          variant="tab"
          title={PROFILE_TAB_MOCK.title}
          subtitle={PROFILE_TAB_MOCK.subtitle}
          showAvatar
          userId={PROFILE_TAB_MOCK.user.id}
          userName={PROFILE_TAB_MOCK.user.name}
        />
      }
    >
      {PROFILE_TAB_MOCK.sections.map((section) => (
        <View key={section.title} style={{ gap: layout.cardGap }}>
          <SectionTitle title={section.title} />
          <SectionCard>
            {section.rows.map((row, index) => (
              <SectionRow
                key={row.id}
                icon={row.icon}
                iconTint="#6B7AAB"
                iconBg="#EEF1FF"
                label={row.label}
                value={row.value}
                showDivider={index < section.rows.length - 1}
                showChevron={!row.value}
              />
            ))}
          </SectionCard>
        </View>
      ))}
    </ScreenLayout>
  );
}
