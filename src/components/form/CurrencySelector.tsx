import { Pressable, Text, View } from 'react-native';

import { PROFILE_CURRENCY_OPTIONS, type CurrencyCode } from '../../types/currency';
import { colors, radii, spacing, typography } from '../../theme';

export function CurrencySelector({
  label = 'Default Currency',
  value,
  onChange,
  disabled,
}: {
  label?: string;
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {PROFILE_CURRENCY_OPTIONS.map((currency) => {
          const selected = currency === value;
          return (
            <Pressable
              key={currency}
              disabled={disabled}
              onPress={() => onChange(currency)}
              style={{
                minWidth: 56,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.borderSubtle,
                backgroundColor: selected ? colors.tertiary : colors.background,
                opacity: disabled ? 0.6 : 1,
              }}
            >
              <Text
                style={[
                  typography.bodyMedium,
                  {
                    color: selected ? colors.primary : colors.textPrimary,
                    textAlign: 'center',
                    fontWeight: selected ? '700' : '500',
                  },
                ]}
              >
                {currency}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
