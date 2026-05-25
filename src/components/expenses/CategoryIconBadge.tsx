import { View } from 'react-native';

import { colors, radii } from '../../theme';
import { getCategoryConfig } from '../../utils/category';
import { Icon } from '../Icon';

const SIZE_MAP = {
  sm: { box: 40, icon: 18, radius: 14 },
  md: { box: 32, icon: 18, radius: 8 },
  lg: { box: 44, icon: 20, radius: 12 },
} as const;

export function CategoryIconBadge({
  categoryKey,
  categoryName,
  categoryId,
  size = 'sm',
  selected = false,
}: {
  categoryKey?: string | null;
  categoryName?: string | null;
  categoryId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
}) {
  const config = getCategoryConfig({ categoryKey, categoryName, categoryId });
  const dimensions = SIZE_MAP[size];

  return (
    <View
      style={{
        width: dimensions.box,
        height: dimensions.box,
        borderRadius: dimensions.radius,
        backgroundColor: selected ? 'rgba(255,255,255,0.2)' : config.bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: selected ? 0 : 1,
        borderColor: colors.borderSubtle,
      }}
    >
      <Icon
        name={config.icon}
        size={dimensions.icon}
        color={selected ? colors.white : config.tint}
        strokeWidth={1.5}
      />
    </View>
  );
}
