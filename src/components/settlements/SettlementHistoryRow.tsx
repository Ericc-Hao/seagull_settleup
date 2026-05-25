import { Text, View } from 'react-native';

import type { SettlementHistoryItemView } from '../../types/views';
import { colors, layout, spacing, typography } from '../../theme';
import { Icon } from '../Icon';

export function SettlementHistoryRow({
  item,
  showDivider = true,
}: {
  item: SettlementHistoryItemView;
  showDivider?: boolean;
}) {
  const modeLabel = item.mode === 'team' ? 'Team' : 'Individual';

  return (
    <View
      style={{
        paddingHorizontal: layout.cardPadding,
        paddingVertical: 14,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: colors.borderSubtle,
        gap: spacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.successSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="check-circle" size={18} color={colors.success} solid />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={[typography.bodyMedium, { flex: 1 }]} numberOfLines={2}>
              {item.summary}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>{item.amountDisplay}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: colors.background,
              }}
            >
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                {modeLabel}
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.success, fontWeight: '600' }]}>Settled</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Paid on {item.paidAtLabel}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
