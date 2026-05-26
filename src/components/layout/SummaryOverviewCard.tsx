import { Text, View } from 'react-native';

import { colors, layout, typography } from '../../theme';
import { ShadowSurface } from './ShadowSurface';

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
}: {
  title: string;
  primaryLabel: string;
  primaryValue: string;
  stats?: SummaryStat[];
  showMascot?: boolean;
}) {
  return (
    <ShadowSurface
      shadow="cardSoft"
      innerStyle={{
        padding: layout.cardPadding,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
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
      </View>
    </ShadowSurface>
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
