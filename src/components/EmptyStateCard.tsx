import { Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';
import { Icon, IconName } from './Icon';
import { PrimaryButton } from './PrimaryButton';
import { ShadowSurface } from './layout/ShadowSurface';
import { VStack } from './layout/Stack';

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
    <ShadowSurface shadow="card" borderRadius={radii.xl} innerStyle={{ padding: spacing.xl }}>
      <VStack gap={spacing.md} align="center">
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
        <VStack gap={spacing.xs} align="center">
          <Text style={[typography.headline, { textAlign: 'center' }]}>{title}</Text>
          <Text style={[typography.caption, { textAlign: 'center' }]}>{message}</Text>
        </VStack>
        {ctaLabel && onPress ? (
          <View style={{ width: '100%', marginTop: spacing.lg }}>
            <PrimaryButton label={ctaLabel} icon={ctaIcon} onPress={onPress} />
          </View>
        ) : null}
      </VStack>
    </ShadowSurface>
  );
}
