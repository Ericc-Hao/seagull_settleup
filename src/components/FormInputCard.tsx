import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';
import { Icon, IconName } from './Icon';
import { ShadowSurface } from './layout/ShadowSurface';
import { VStack } from './layout/Stack';

export function FormInputCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <ShadowSurface shadow="card" borderRadius={radii.xl} innerStyle={{ padding: spacing.lg }}>
      <VStack gap={spacing.md}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {icon ? (
            <View style={{ marginRight: spacing.sm }}>
              <Icon name={icon} size={18} color={colors.primary} />
            </View>
          ) : null}
          <Text style={typography.bodyMedium}>{title}</Text>
        </View>
        {children}
      </VStack>
    </ShadowSurface>
  );
}
