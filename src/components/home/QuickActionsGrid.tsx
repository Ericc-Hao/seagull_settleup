/**
 * Home uses this grid — not src/components/QuickActionCard.tsx.
 * Fixed 2x2 layout with explicit 50% cell widths for iOS.
 */
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import type { IconName } from '../Icon';
import { Icon } from '../Icon';
import { colors, shadows, typography } from '../../theme';

const CARD_RADIUS = 22;
const CARD_PADDING_X = 16;
const CARD_PADDING_TOP = 20;
const CARD_PADDING_BOTTOM = 26;
const DIVIDER_INSET = 12;
const ICON_SIZE = 36;
const ROW_HEIGHT = 90;

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
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={styles.row}
          >
            {row.map((action) => (
              <View
                key={action.id}
                style={styles.cellFrame}
              >
                <QuickActionCell
                  action={action}
                  onPress={() => onAction(action.id)}
                />
              </View>
            ))}
          </View>
        ))}
        <View pointerEvents="none" style={styles.verticalDivider} />
        <View pointerEvents="none" style={styles.horizontalDivider} />
      </View>
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
      <View style={styles.cellContent}>
        <View style={styles.iconWrap}>
          <Icon name={action.icon} size={18} color={colors.primary} strokeWidth={1.5} />
        </View>
        <View style={styles.labelWrap}>
          <Text numberOfLines={2} ellipsizeMode="tail" style={styles.label}>
            {action.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const cellFrameBase: ViewStyle = {
  width: '50%',
  minWidth: 0,
  maxWidth: '50%',
  flexGrow: 0,
  flexShrink: 0,
};

const cellBase: ViewStyle = {
  width: '100%',
  height: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 10,
  paddingHorizontal: 8,
  minHeight: ROW_HEIGHT,
  overflow: 'hidden',
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: CARD_RADIUS,
    paddingTop: CARD_PADDING_TOP,
    paddingBottom: CARD_PADDING_BOTTOM,
    paddingHorizontal: CARD_PADDING_X,
    borderWidth: 1,
    borderColor: colors.tertiary,
    ...shadows.cardSoft,
  },
  grid: {
    width: '100%',
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    height: ROW_HEIGHT,
  },
  verticalDivider: {
    position: 'absolute',
    left: '50%',
    top: DIVIDER_INSET,
    bottom: DIVIDER_INSET,
    width: 1,
    marginLeft: -0.5,
    backgroundColor: colors.tertiary,
  },
  horizontalDivider: {
    position: 'absolute',
    left: DIVIDER_INSET,
    right: DIVIDER_INSET,
    top: ROW_HEIGHT,
    height: 1,
    marginTop: -0.5,
    backgroundColor: colors.tertiary,
  },
  cellFrame: cellFrameBase,
  cell: cellBase,
  cellContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  labelWrap: {
    width: '100%',
    maxWidth: 104,
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 9,
  },
  label: {
    ...typography.caption,
    width: '100%',
    textAlign: 'center',
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
