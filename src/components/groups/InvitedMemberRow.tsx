import { Pressable, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { Icon } from '../Icon';

export function InvitedMemberRow({
  email,
  status,
  onRemove,
}: {
  email: string;
  status: string;
  onRemove: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={typography.bodyMedium}>{email}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{status}</Text>
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={{
          width: 32,
          height: 32,
          borderRadius: radii.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <Icon name="x-mark" size={16} color={colors.textTertiary} strokeWidth={1.5} />
      </Pressable>
    </View>
  );
}
