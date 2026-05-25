import { Pressable, Text, View } from 'react-native';

import type { CategoryKey } from '../../constants/categories';
import { colors, radii, typography } from '../../theme';
import { CategoryIconBadge } from '../expenses/CategoryIconBadge';

export interface CategoryOption {
  key: CategoryKey;
  id?: string;
  label: string;
}

export function CategoryGrid({
  options,
  selectedKey,
  onSelect,
}: {
  options: CategoryOption[];
  selectedKey: CategoryKey | '';
  onSelect: (key: CategoryKey) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => {
        const active = selectedKey === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            style={{
              width: '31%',
              alignItems: 'center',
              paddingVertical: 10,
              borderRadius: radii.md,
              backgroundColor: active ? colors.primary : colors.background,
            }}
          >
            <CategoryIconBadge
              categoryKey={option.key}
              categoryName={option.label}
              categoryId={option.id}
              size="md"
              selected={active}
            />
            <Text
              style={[
                typography.caption,
                { marginTop: 4, fontWeight: '600', color: active ? colors.white : colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
