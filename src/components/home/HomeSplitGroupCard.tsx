import { Pressable, Text, View } from 'react-native';

import { colors, layout, typography } from '../../theme';
import { Icon } from '../Icon';
import { ShadowSurface } from '../layout/ShadowSurface';

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
    <ShadowSurface shadow="cardSoft" style={{ flex: 1 }}>
      <Pressable onPress={onPress} style={{ padding: layout.cardPadding }}>
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
    </ShadowSurface>
  );
}
