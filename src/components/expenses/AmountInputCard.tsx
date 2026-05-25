import { TextInput, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../../theme';
import { formatCAD } from '../../utils/money';

export function AmountInputCard({
  amountCents,
  onChangeAmountText,
  amountText,
  currency = 'CAD',
  error,
}: {
  amountCents: number;
  amountText: string;
  onChangeAmountText: (value: string) => void;
  currency?: string;
  error?: string;
}) {
  const displayHint = amountCents > 0 ? formatCAD(amountCents) : '$0.00 CAD';

  return (
    <View
      style={{
        borderRadius: radii.lg,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: error ? colors.danger : colors.borderSubtle,
        padding: spacing.lg,
        gap: spacing.sm,
        ...shadows.cardSoft,
      }}
    >
      <Text style={[typography.caption, { color: colors.textSecondary }]}>Amount</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={[typography.amount, { fontSize: 28, color: colors.textPrimary }]}>$</Text>
        <TextInput
          value={amountText}
          onChangeText={onChangeAmountText}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textTertiary}
          style={[
            typography.amount,
            {
              flex: 1,
              fontSize: 28,
              color: colors.textPrimary,
              paddingVertical: 0,
            },
          ]}
        />
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{currency}</Text>
      </View>
      <Text style={[typography.caption, { color: colors.textTertiary }]}>{displayHint}</Text>
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}
