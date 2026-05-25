import { Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { Icon } from '../Icon';

export function LockedCurrencyField() {
  return (
    <View style={fieldRowStyle}>
      <Text style={[typography.body, { flex: 1, color: colors.textSecondary }]}>
        CAD – Canadian Dollar
      </Text>
      <Icon name="lock-closed" size={18} color={colors.textTertiary} strokeWidth={1.5} />
    </View>
  );
}

const fieldRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: colors.background,
  borderRadius: radii.md,
  paddingHorizontal: spacing.md,
  paddingVertical: 12,
  gap: spacing.sm,
  opacity: 0.85,
};
