import { Text, View } from 'react-native';

import { colors, radii, typography } from '../../theme';

export function GroupTagPill({ groupName }: { groupName: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radii.pill,
        backgroundColor: colors.tertiary,
      }}
    >
      <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>{groupName}</Text>
    </View>
  );
}
