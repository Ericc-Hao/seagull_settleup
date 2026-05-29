import { TextInput, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { CurrencyCode } from '../../types/currency';
import { formatCurrency } from '../../utils/currency';

export function AmountInputCard({
  amountCents,
  onChangeAmountText,
  amountText,
  currency = 'CAD',
  error,
  hint,
}: {
  amountCents: number;
  amountText: string;
  onChangeAmountText: (value: string) => void;
  currency?: CurrencyCode | string;
  error?: string;
  hint?: string;
}) {
  const resolvedCurrency = (currency as CurrencyCode) || 'CAD';
  const displayHint =
    hint ??
    (amountCents > 0 ? formatCurrency(amountCents, resolvedCurrency) : formatCurrency(0, resolvedCurrency));

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
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{resolvedCurrency}</Text>
      </View>
      <Text style={[typography.caption, { color: colors.textTertiary }]}>{displayHint}</Text>
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}
