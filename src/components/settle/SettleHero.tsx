import { Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../../theme';
import { Icon } from '../Icon';

export function SettleHero() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        justifyContent: 'flex-start',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.xl,
        backgroundColor: colors.white,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        ...shadows.cardSoft,
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
        }}
      >
        <Icon name="banknotes" size={24} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.headline}>Settlement Summary</Text>
        <Text style={[typography.caption, { marginTop: 4 }]}>Review transfers before marking balances paid.</Text>
      </View>
    </View>
  );
}
