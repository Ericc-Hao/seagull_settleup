import { Text, View } from 'react-native';

import { colors, layout, radii, spacing, typography } from '../../theme';
import { Icon } from '../Icon';
import { SecondaryButton } from '../SecondaryButton';

export function SettleTogetherCard({ onPress }: { onPress: () => void }) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: layout.cardRadius,
        padding: layout.cardPadding,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radii.md,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="user-group" size={18} color={colors.primary} strokeWidth={1.5} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={typography.bodyMedium}>Settle together</Text>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
            Combine selected members into one settlement for this payment.
          </Text>
        </View>
      </View>
      <SecondaryButton label="Settle as a team" icon="user-group" onPress={onPress} variant="outline" />
    </View>
  );
}
