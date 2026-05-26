/**
 * Home uses this grid — not src/components/QuickActionCard.tsx.
 * Fixed 2x2 layout with explicit 50% cell widths for iOS.
 */
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import type { IconName } from '../Icon';
import { Icon } from '../Icon';
import { colors, shadows, typography } from '../../theme';

const CARD_RADIUS = 22;
const CARD_PADDING = 18;
const ICON_SIZE = 36;
const ROW_MIN_HEIGHT = 72;

export interface QuickActionItem {
  id: string;
  label: string;
  icon: IconName;
}

export function QuickActionsGrid({
  actions,
  onAction,
}: {
  actions: QuickActionItem[];
  onAction: (id: string) => void;
}) {
  const rows = [actions.slice(0, 2), actions.slice(2, 4)];

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[styles.row, rowIndex > 0 ? styles.rowDivider : null]}
        >
          {row.length > 1 ? <View pointerEvents="none" style={styles.verticalDivider} /> : null}
          {row.map((action) => (
            <QuickActionCell
              key={action.id}
              action={action}
              onPress={() => onAction(action.id)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function QuickActionCell({
  action,
  onPress,
}: {
  action: QuickActionItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.75 : 1 }]}
    >
      <View style={styles.iconWrap}>
        <Icon name={action.icon} size={18} color={colors.primary} strokeWidth={1.5} />
      </View>
      <View style={styles.labelWrap}>
        <Text numberOfLines={2} ellipsizeMode="tail" style={styles.label}>
          {action.label}
        </Text>
      </View>
    </Pressable>
  );
}

const cellBase: ViewStyle = {
  width: '50%',
  minWidth: 0,
  maxWidth: '50%',
  flexGrow: 0,
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 12,
  paddingHorizontal: 8,
  minHeight: ROW_MIN_HEIGHT,
  overflow: 'hidden',
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: CARD_RADIUS,
    padding: CARD_PADDING,
    borderWidth: 1,
    borderColor: colors.tertiary,
    ...shadows.cardSoft,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    minHeight: ROW_MIN_HEIGHT,
    position: 'relative',
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.tertiary,
  },
  verticalDivider: {
    position: 'absolute',
    left: '50%',
    top: 8,
    bottom: 8,
    width: 1,
    marginLeft: -0.5,
    backgroundColor: colors.tertiary,
  },
  cell: cellBase,
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 6,
  },
  label: {
    ...typography.caption,
    width: '100%',
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
