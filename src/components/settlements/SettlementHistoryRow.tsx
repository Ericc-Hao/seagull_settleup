import { Text, View } from 'react-native';

import type { SettlementHistoryItemView } from '../../types/views';
import { colors, layout, spacing, typography } from '../../theme';
import { Icon } from '../Icon';

export function SettlementHistoryRow({
  item,
  showDivider = true,
  showGroupTag = false,
}: {
  item: SettlementHistoryItemView;
  showDivider?: boolean;
  showGroupTag?: boolean;
}) {
  const title =
    item.historyTitle ?? (item.mode === 'team' ? 'Team settlement' : `Paid ${item.receiverName}`);
  const baseDetailLine =
    item.detailLine ?? (item.mode === 'team' ? 'Team · Settled' : 'Individual · Settled');
  const detailLine =
    showGroupTag && item.groupName
      ? item.mode === 'individual'
        ? `${item.groupName} · Individual · Settled`
        : `${item.groupName} · ${baseDetailLine}`
      : baseDetailLine;

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
          <Text style={typography.bodyMedium}>{title}</Text>
          <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>{item.amountDisplay}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{detailLine}</Text>
          {item.paidToLine ? (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.paidToLine}</Text>
          ) : null}
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {item.isZeroPayment ? 'Confirmed on' : 'Settled on'} {item.paidAtLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}
