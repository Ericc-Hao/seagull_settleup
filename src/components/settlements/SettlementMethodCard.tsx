import { Pressable, Text, View } from 'react-native';

import type { SettlementMode } from '../../types/models';
import { colors, layout, radii, spacing, typography } from '../../theme';
import { Icon } from '../Icon';

const OPTIONS: { id: SettlementMode; label: string; description: string }[] = [
  {
    id: 'individual',
    label: 'Individual',
    description: 'Settle your balance on your own.',
  },
  {
    id: 'team',
    label: 'Settle as a team',
    description: 'Combine selected members into one settlement unit.',
  },
];

export function SettlementMethodCard({
  value,
  onChange,
}: {
  value: SettlementMode;
  onChange: (mode: SettlementMode) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: layout.cardRadius,
        padding: layout.cardPadding,
        gap: spacing.sm,
      }}
    >
      <Text style={typography.sectionTitle}>Settlement method</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        Choose how you want to settle this group.
      </Text>
      <View style={{ gap: 8, marginTop: 4 }}>
        {OPTIONS.map((option) => {
          const active = value === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: radii.md,
                backgroundColor: active ? colors.tertiary : colors.background,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.borderSubtle,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: active ? colors.primary : colors.borderSubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {active ? (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.primary,
                    }}
                  />
                ) : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>{option.label}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{option.description}</Text>
              </View>
              {active ? <Icon name="check-circle" size={18} color={colors.primary} solid /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
