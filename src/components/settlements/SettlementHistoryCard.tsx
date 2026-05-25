import { Text, View } from 'react-native';

import type { SettlementHistoryItemView } from '../../types/views';
import { colors, layout, spacing, typography } from '../../theme';
import { SettlementHistoryRow } from './SettlementHistoryRow';

export function SettlementHistoryCard({
  items,
  showGroupTag = false,
}: {
  items: SettlementHistoryItemView[];
  showGroupTag?: boolean;
}) {
  if (items.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: layout.cardRadius,
          padding: layout.cardPadding,
          gap: spacing.xs,
        }}
      >
        <Text style={typography.sectionTitle}>Settlement History</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Paid transfers will appear here once you mark a balance as settled.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.sectionTitle}>Settlement History</Text>
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: layout.cardRadius,
          overflow: 'hidden',
        }}
      >
        {items.map((item, index) => (
          <SettlementHistoryRow
            key={item.id}
            item={item}
            showDivider={index < items.length - 1}
            showGroupTag={showGroupTag}
          />
        ))}
      </View>
    </View>
  );
}
