import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { formatCAD } from '../utils/money';
import { colors, radii, shadows, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { SeagullMascot } from './SeagullAvatar';

interface OverviewCardProps {
  monthLabel: string;
  totalSpentCents: number;
  youOwedCents: number;
  youOweCents: number;
  onPress?: () => void;
}

export function OverviewCard({
  monthLabel,
  totalSpentCents,
  youOwedCents,
  youOweCents,
  onPress,
}: OverviewCardProps) {
  return (
    <Pressable onPress={onPress} style={[{ borderRadius: radii['2xl'], overflow: 'hidden' }, shadows.card]}>
      <LinearGradient
        colors={['#E8EBFF', '#F4F6FF', colors.white]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: spacing.lg }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={typography.label}>{monthLabel} Overview</Text>
              <Icon name="chevron-right" size={14} color={colors.textSecondary} />
            </Pressable>
            <Text style={[typography.caption, { marginTop: spacing.sm }]}>Total Spent</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
              <Text style={typography.amount}>{formatCAD(totalSpentCents).replace(/\sCAD$/, '')}</Text>
              <Text style={[typography.caption, { marginLeft: 6 }]}>CAD</Text>
            </View>
          </View>
          <SeagullMascot size={80} />
        </View>

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <BalanceRow
            icon="arrow-up-circle"
            iconColor={colors.success}
            iconBg={colors.successSoft}
            label="You are owed"
            amount={youOwedCents}
            amountColor={colors.success}
          />
          <BalanceRow
            icon="arrow-down-circle"
            iconColor={colors.owe}
            iconBg={colors.oweSoft}
            label="You owe"
            amount={youOweCents}
            amountColor={colors.owe}
          />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function BalanceRow({
  icon,
  iconColor,
  iconBg,
  label,
  amount,
  amountColor,
}: {
  icon: 'arrow-up-circle' | 'arrow-down-circle';
  iconColor: string;
  iconBg: string;
  label: string;
  amount: number;
  amountColor: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={16} color={iconColor} solid />
      </View>
      <Text style={typography.caption}>{label}</Text>
      <Text style={[typography.bodyMedium, { marginLeft: 'auto', color: amountColor }]}>
        {formatCAD(amount)}
      </Text>
    </View>
  );
}
