import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii, shadows, spacing, typography } from '../../theme';

export function AmountCard({
  label,
  amount,
}: {
  label: string;
  amount: string;
}) {
  return (
    <View style={[{ borderRadius: radii.lg, overflow: 'hidden' }, shadows.cardSoft]}>
      <LinearGradient
        colors={['#F0F2FF', '#FAFBFF', colors.white]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: spacing.lg }}
      >
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.amount, { fontSize: 28, marginTop: 6 }]}>{amount}</Text>
      </LinearGradient>
    </View>
  );
}
