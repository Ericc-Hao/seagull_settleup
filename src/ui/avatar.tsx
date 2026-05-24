import { Text, View } from 'react-native';

import { Icon } from './icon';
import { AVATAR_COLORS } from './theme';

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({
  id,
  label,
  size = 'md',
  selected = false,
}: {
  id: string;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
}) {
  const letter = label.charAt(0).toUpperCase();
  const sizeClass = size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';
  const textClass = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';

  return (
    <View className="relative">
      <View
        className={`items-center justify-center rounded-full ${sizeClass} ${selected ? 'border-2 border-brand-300' : ''}`}
        style={{ backgroundColor: colorForId(id) }}
      >
        <Text className={`font-bold text-brand-navy ${textClass}`}>{letter}</Text>
      </View>
      {selected ? (
        <View className="absolute -bottom-0.5 -right-0.5 h-4 w-4 items-center justify-center rounded-full bg-brand-300">
          <Icon name="check-circle" size={14} color="#FFFFFF" solid />
        </View>
      ) : null}
    </View>
  );
}
