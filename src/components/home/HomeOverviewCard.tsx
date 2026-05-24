import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii, shadows, spacing, typography } from '../../theme';
import { SeagullMascot } from '../SeagullAvatar';

export function HomeOverviewCard({
  title,
  totalSpent,
  youOwed,
  youOwe,
}: {
  title: string;
  totalSpent: string;
  youOwed: string;
  youOwe: string;
}) {
  return (
    <View style={[{ borderRadius: radii.xl, overflow: 'hidden' }, shadows.cardSoft]}>
      <LinearGradient
        colors={['#F0F2FF', '#FAFBFF', colors.white]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.5 }}
        style={{ padding: spacing.lg, paddingBottom: spacing.lg + 4 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>{title}</Text>
            <Text style={[typography.caption, { marginTop: spacing.md, color: colors.textSecondary }]}>
              Total Spent
            </Text>
            <Text style={[typography.amount, { fontSize: 28, marginTop: 4 }]}>{totalSpent}</Text>

            <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
              <BalanceLine label="You are owed" amount={youOwed} tone="owed" />
              <BalanceLine label="You owe" amount={youOwe} tone="owe" />
            </View>
          </View>
          <View style={{ marginTop: -4 }}>
            <SeagullMascot size={72} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function BalanceLine({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: string;
  tone: 'owed' | 'owe';
}) {
  const dotColor = tone === 'owed' ? colors.success : colors.owe;
  const amountColor = tone === 'owed' ? colors.success : colors.owe;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: dotColor,
          marginRight: spacing.sm,
        }}
      />
      <Text style={[typography.caption, { flex: 1 }]}>{label}</Text>
      <Text style={[typography.bodyMedium, { color: amountColor }]}>{amount}</Text>
    </View>
  );
}
