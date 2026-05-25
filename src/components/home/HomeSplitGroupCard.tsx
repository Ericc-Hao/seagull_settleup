import { Pressable, Text, View } from 'react-native';

import { colors, layout, shadows, typography } from '../../theme';
import { Icon } from '../Icon';

export function HomeSplitGroupCard({
  name,
  balance,
  positive,
  onPress,
}: {
  name: string;
  balance: string;
  positive: boolean;
  onPress?: () => void;
}) {
  const balanceColor = positive ? colors.success : colors.owe;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: layout.cardRadius,
        padding: layout.cardPadding,
        ...shadows.cardSoft,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        }}
      >
        <Icon name="user-group" size={18} color={colors.primary} />
      </View>
      <Text style={typography.bodyMedium} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[typography.caption, { color: balanceColor, marginTop: 6, fontWeight: '600' }]} numberOfLines={2}>
        {balance}
      </Text>
    </Pressable>
  );
}
