import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, layout, shadows, typography } from '../../theme';
import { SeagullMascot } from '../SeagullAvatar';

export interface SummaryStat {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative';
}

export function SummaryOverviewCard({
  title,
  primaryLabel,
  primaryValue,
  stats,
  showMascot = true,
}: {
  title: string;
  primaryLabel: string;
  primaryValue: string;
  stats?: SummaryStat[];
  showMascot?: boolean;
}) {
  return (
    <View
      style={{
        width: '100%',
        borderRadius: layout.cardRadius,
        overflow: 'hidden',
        ...shadows.cardSoft,
      }}
    >
      <LinearGradient
        colors={['#F0F2FF', '#FAFBFF', colors.white]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.5 }}
        style={{ padding: layout.cardPadding }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: showMascot ? 8 : 0 }}>
            <Text style={typography.sectionTitle}>{title}</Text>
            <Text style={[typography.caption, { marginTop: layout.cardGap, color: colors.textSecondary }]}>
              {primaryLabel}
            </Text>
            <Text style={[typography.amountLarge, { fontSize: 28, marginTop: 4 }]}>{primaryValue}</Text>
            {stats && stats.length > 0 ? (
              <View style={{ marginTop: layout.sectionGap / 2 }}>
                {stats.map((stat, index) => (
                  <View key={stat.label} style={{ marginTop: index === 0 ? 0 : 10 }}>
                    <StatRow {...stat} />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          {showMascot ? (
            <View style={{ marginTop: -4 }}>
              <SeagullMascot size={64} />
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

function StatRow({ label, value, tone = 'default' }: SummaryStat) {
  const valueColor =
    tone === 'positive' ? colors.success : tone === 'negative' ? colors.danger : colors.textPrimary;
  const dotColor = tone === 'positive' ? colors.success : tone === 'negative' ? colors.danger : colors.primary;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: dotColor,
          marginRight: 10,
        }}
      />
      <Text style={[typography.caption, { flex: 1 }]}>{label}</Text>
      <Text style={[typography.bodyMedium, { color: valueColor }]}>{value}</Text>
    </View>
  );
}
