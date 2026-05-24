import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../theme';
import { Icon, IconName } from './Icon';

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
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: radii.xl,
        padding: spacing.lg,
        gap: spacing.md,
        ...shadows.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {icon ? <Icon name={icon} size={18} color={colors.primary} /> : null}
        <Text style={typography.bodyMedium}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

