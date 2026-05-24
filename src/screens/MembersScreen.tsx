import { Text, View } from 'react-native';

import { demoMembers } from '../demo/mvpData';
import { labelClassName, rowClassName, ScreenCard, ScreenContainer, valueClassName } from './shared';

export function MembersScreen() {
  return (
    <ScreenContainer title="Members" subtitle="Manual members can be added without account signup">
      <ScreenCard title="Current Group Members">
        {demoMembers.map((member) => (
          <View key={member.id} className={rowClassName}>
            <Text className={labelClassName}>{member.displayName}</Text>
            <Text className={valueClassName}>Team: {member.teamId ?? 'Solo'}</Text>
          </View>
        ))}
      </ScreenCard>
    </ScreenContainer>
  );
}
