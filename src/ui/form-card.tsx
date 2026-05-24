import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Icon, IconName } from './icon';
import { SurfaceCard } from './surface-card';
import { BRAND } from './theme';

export function FormCard({
  title,
  icon,
  children,
  compact,
}: {
  title: string;
  icon?: IconName;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <SurfaceCard className={compact ? 'p-3' : ''}>
      <View className="mb-3 flex-row items-center gap-2">
        {icon ? <Icon name={icon} size={18} color={BRAND.lavender} /> : null}
        <Text className="text-sm font-bold text-brand-navy">{title}</Text>
      </View>
      <View className="gap-3">{children}</View>
    </SurfaceCard>
  );
}
