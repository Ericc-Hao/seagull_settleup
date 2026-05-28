import { Pressable, Text, View } from 'react-native';

import type { SplitExpenseSettlementStatus } from '../../types/views';
import { colors, layout, typography } from '../../theme';
import { formatCAD } from '../../utils/money';
import { CategoryIconBadge } from './CategoryIconBadge';
import { Icon } from '../Icon';

export type SplitExpenseCardVariant = 'expenses-tab' | 'group-detail';

export function formatSplitExpenseSettlementLabel(status: SplitExpenseSettlementStatus): string {
  switch (status) {
    case 'not_split':
      return 'Not split yet';
    case 'not_settled':
      return 'Not settled';
    case 'settled':
      return 'Settled';
  }
}

function settlementStatusColor(status: SplitExpenseSettlementStatus): string {
  switch (status) {
    case 'settled':
      return colors.success;
    case 'not_settled':
      return colors.owe;
    case 'not_split':
      return colors.textSecondary;
  }
}

export function SplitExpenseCard({
  expenseId,
  title,
  categoryName,
  categoryKey,
  categoryId,
  groupName,
  totalAmountCents,
  myShareAmountCents,
  settlementStatus,
  includedInSplit,
  variant = 'expenses-tab',
  onPress,
  showDivider = true,
  showChevron = true,
}: {
  expenseId: string;
  title: string;
  categoryName?: string;
  categoryKey?: string;
  categoryId?: string;
  groupName?: string;
  totalAmountCents: number;
  myShareAmountCents: number;
  settlementStatus: SplitExpenseSettlementStatus;
  includedInSplit: boolean;
  variant?: SplitExpenseCardVariant;
  onPress?: (expenseId: string) => void;
  showDivider?: boolean;
  showChevron?: boolean;
}) {
  const totalLabel = `Total ${formatCAD(totalAmountCents)}`;
  const statusLabel = formatSplitExpenseSettlementLabel(settlementStatus);
  const statusColor = settlementStatusColor(settlementStatus);

  let detailText: string | undefined;
  let secondaryLine: string | undefined;

  if (settlementStatus === 'not_split') {
    detailText = totalLabel;
  } else if (!includedInSplit) {
    secondaryLine = 'Not included';
    detailText = totalLabel;
  } else if (variant === 'group-detail') {
    detailText = `Your share · ${totalLabel}`;
  } else {
    detailText = [groupName, totalLabel].filter(Boolean).join(' · ');
  }

  return (
    <Pressable
      onPress={onPress ? () => onPress(expenseId) : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: layout.cardPadding,
        paddingVertical: 14,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: colors.borderSubtle,
      }}
    >
      <View style={{ marginRight: 12 }}>
        <CategoryIconBadge
          categoryKey={categoryKey}
          categoryName={categoryName}
          categoryId={categoryId}
          size="sm"
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyMedium}>{title}</Text>
        {secondaryLine ? (
          <Text style={[typography.caption, { marginTop: 2, color: colors.textSecondary }]}>{secondaryLine}</Text>
        ) : null}
        {detailText ? (
          <Text style={[typography.caption, { marginTop: 2, color: colors.textTertiary }]}>{detailText}</Text>
        ) : null}
        <Text style={[typography.caption, { marginTop: 4, color: statusColor, fontWeight: '600' }]}>
          {statusLabel}
        </Text>
      </View>
      <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginRight: 8 }]}>
        {formatCAD(myShareAmountCents)}
      </Text>
      {showChevron ? <Icon name="chevron-right" size={16} color={colors.textTertiary} /> : null}
    </Pressable>
  );
}
