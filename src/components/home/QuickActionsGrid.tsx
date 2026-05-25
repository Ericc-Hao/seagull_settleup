import { Pressable, Text, View } from 'react-native';

import type { IconName } from '../Icon';
import { Icon } from '../Icon';
import { colors, shadows, typography } from '../../theme';

const CARD_RADIUS = 22;
const CARD_PADDING = 18;
const ICON_SIZE = 36;

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
    <View
      style={{
        width: '100%',
        backgroundColor: colors.white,
        borderRadius: CARD_RADIUS,
        padding: CARD_PADDING,
        borderWidth: 1,
        borderColor: colors.tertiary,
        ...shadows.cardSoft,
      }}
    >
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={{
            flexDirection: 'row',
            borderTopWidth: rowIndex > 0 ? 1 : 0,
            borderTopColor: colors.tertiary,
          }}
        >
          {row.map((action, colIndex) => (
            <QuickActionCell
              key={action.id}
              action={action}
              onPress={() => onAction(action.id)}
              showLeftDivider={colIndex > 0}
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
  showLeftDivider,
}: {
  action: QuickActionItem;
  onPress: () => void;
  showLeftDivider?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        opacity: pressed ? 0.75 : 1,
        borderLeftWidth: showLeftDivider ? 1 : 0,
        borderLeftColor: colors.tertiary,
      })}
    >
      <View
        style={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: ICON_SIZE / 2,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={action.icon} size={18} color={colors.primary} strokeWidth={1.5} />
      </View>
      <Text
        style={[
          typography.caption,
          {
            marginTop: 6,
            textAlign: 'center',
            fontSize: 12,
            lineHeight: 15,
            fontWeight: '600',
            color: colors.textPrimary,
          },
        ]}
        numberOfLines={2}
      >
        {action.label}
      </Text>
    </Pressable>
  );
}
