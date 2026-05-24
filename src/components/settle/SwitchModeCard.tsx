import { Pressable, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../../theme';
import { Icon } from '../Icon';

export function SwitchModeCard({
  title,
  hint,
  onPress,
}: {
  title: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.white,
        borderRadius: radii.lg,
        padding: spacing.lg,
        ...shadows.cardSoft,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="user" size={20} color={colors.primary} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyMedium}>{title}</Text>
        <Text style={[typography.caption, { marginTop: 2, color: colors.textSecondary }]}>{hint}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.textTertiary} strokeWidth={1.5} />
    </Pressable>
  );
}
