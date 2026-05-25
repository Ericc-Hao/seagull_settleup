import { Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../theme';
import { Icon, IconName } from './Icon';
import { PrimaryButton } from './PrimaryButton';

export function EmptyStateCard({
  title,
  message,
  ctaLabel,
  ctaIcon,
  onPress,
}: {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaIcon?: IconName;
  onPress?: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: radii.xl,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.md,
        ...shadows.card,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 18,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={ctaIcon ?? 'sparkles'} size={22} color={colors.primary} />
      </View>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Text style={[typography.headline, { textAlign: 'center' }]}>{title}</Text>
        <Text style={[typography.caption, { textAlign: 'center' }]}>{message}</Text>
      </View>
      {ctaLabel && onPress ? <PrimaryButton label={ctaLabel} icon={ctaIcon} onPress={onPress} /> : null}
    </View>
  );
}
