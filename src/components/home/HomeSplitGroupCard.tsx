import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, layout, shadows, typography } from '../../theme';

export function HomeSplitGroupCard({
  name,
  balance,
  positive,
  gradient,
  onPress,
}: {
  name: string;
  balance: string;
  positive: boolean;
  gradient: [string, string];
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
      <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', marginBottom: 10 }}>
        <LinearGradient colors={gradient} style={{ flex: 1 }} />
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
