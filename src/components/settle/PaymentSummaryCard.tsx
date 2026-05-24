import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii, shadows, spacing, typography } from '../../theme';
import { SeagullAvatar } from '../SeagullAvatar';

export function PaymentSummaryCard({
  direction,
  amount,
  fromMemberIds,
  toMemberIds,
}: {
  direction: string;
  amount: string;
  fromMemberIds: readonly string[];
  toMemberIds: readonly string[];
}) {
  return (
    <View style={[{ borderRadius: radii.lg, overflow: 'hidden' }, shadows.cardSoft]}>
      <LinearGradient
        colors={[colors.surfaceMuted, '#F5F7FF', colors.white]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ padding: spacing.lg, alignItems: 'center' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md }}>
          <AvatarCluster ids={fromMemberIds} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>→</Text>
          <AvatarCluster ids={toMemberIds} />
        </View>
        <Text style={[typography.bodyMedium, { textAlign: 'center', color: colors.textSecondary }]}>
          {direction}
        </Text>
        <Text style={[typography.amount, { fontSize: 32, marginTop: spacing.sm }]}>{amount}</Text>
      </LinearGradient>
    </View>
  );
}

function AvatarCluster({ ids }: { ids: readonly string[] }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {ids.map((id, index) => (
        <View key={id} style={{ marginLeft: index === 0 ? 0 : -10 }}>
          <SeagullAvatar id={id} label={id} size={28} />
        </View>
      ))}
    </View>
  );
}
