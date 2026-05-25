import { Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../../theme';

export function AmountCard({
  label,
  amount,
}: {
  label: string;
  amount: string;
}) {
  return (
    <View
      style={[
        {
          borderRadius: radii.lg,
          overflow: 'hidden',
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          padding: spacing.lg,
        },
        shadows.cardSoft,
      ]}
    >
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[typography.amount, { fontSize: 28, marginTop: 6 }]}>{amount}</Text>
    </View>
  );
}
