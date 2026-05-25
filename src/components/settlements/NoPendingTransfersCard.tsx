import { Text, View } from 'react-native';

import { colors, layout, spacing, typography } from '../../theme';
import { Icon } from '../Icon';

export function NoPendingTransfersCard() {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: layout.cardRadius,
        padding: layout.cardPadding,
        alignItems: 'center',
        gap: spacing.sm,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.successSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="check-circle" size={24} color={colors.success} solid />
      </View>
      <Text style={[typography.bodyMedium, { textAlign: 'center' }]}>No pending transfers</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
        You&apos;re all settled for now. New shared expenses will appear here.
      </Text>
    </View>
  );
}
