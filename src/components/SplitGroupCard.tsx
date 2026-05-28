import { Pressable, Text, View } from 'react-native';

import { formatCAD } from '../utils/money';
import type { GroupCardView } from '../types/views';
import { colors, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { ShadowSurface } from './layout/ShadowSurface';

export function SplitGroupCard({
  group,
  onPress,
  layout = 'horizontal',
}: {
  group: GroupCardView;
  onPress?: () => void;
  layout?: 'horizontal' | 'grid' | 'full';
}) {
  const balanceColor =
    group.balanceStatus === 'settled'
      ? colors.textSecondary
      : group.balancePositive
        ? colors.success
        : colors.owe;

  if (layout === 'grid' || layout === 'full') {
    return (
      <ShadowSurface shadow="cardSoft" borderRadius={radii.xl}>
        <Pressable
          onPress={onPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.md,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.md,
            }}
          >
            <Icon name="user-group" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyMedium}>{group.name}</Text>
            <Text style={[typography.caption, { color: balanceColor, marginTop: 2 }]}>
              {group.balanceLabel || 'No pending balance'}
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.textTertiary} />
        </Pressable>
      </ShadowSurface>
    );
  }

  return (
    <ShadowSurface shadow="cardSoft" borderRadius={radii.xl} style={{ marginRight: spacing.md, width: 168 }}>
      <Pressable onPress={onPress} style={{ padding: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="user-group" size={18} color={colors.primary} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="user-group" size={14} color={colors.textSecondary} />
            <Text style={[typography.caption, { marginLeft: 4 }]}>{group.memberCount}</Text>
          </View>
        </View>
      <Text style={[typography.bodyMedium, { marginTop: spacing.sm }]} numberOfLines={1}>
        {group.name}
      </Text>
      <Text style={[typography.caption, { marginTop: 4 }]}>Total {formatCAD(group.totalSpentCents)}</Text>
      {group.balanceLabel ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }}>
          <Text style={[typography.caption, { color: balanceColor, fontWeight: '600', flex: 1 }]} numberOfLines={1}>
            {group.balanceLabel}
          </Text>
          <Icon name="chevron-right" size={14} color={balanceColor} />
        </View>
      ) : (
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>No pending balance</Text>
      )}
      </Pressable>
    </ShadowSurface>
  );
}
