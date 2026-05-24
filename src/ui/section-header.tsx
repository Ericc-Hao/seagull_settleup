import { Pressable, Text, View } from 'react-native';

import { Icon } from './icon';
import { BRAND } from './theme';

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const action = actionLabel ? (
    <Pressable onPress={onAction} className="flex-row items-center gap-0.5" disabled={!onAction}>
      <Text className="text-sm font-semibold text-brand-500">{actionLabel.replace(' ›', '')}</Text>
      <Icon name="chevron-right" size={16} color={BRAND.lavender} />
    </Pressable>
  ) : null;

  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[17px] font-bold text-brand-navy">{title}</Text>
      {action}
    </View>
  );
}
