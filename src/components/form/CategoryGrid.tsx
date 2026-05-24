import { Pressable, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { Icon, IconName } from '../Icon';

export interface CategoryOption {
  id: string;
  label: string;
  icon: IconName;
}

const CATEGORY_COLORS: Record<string, { tint: string; bg: string }> = {
  Hotel: { tint: '#3B82F6', bg: '#EFF6FF' },
  Food: { tint: '#F97316', bg: '#FFF7ED' },
  Gas: { tint: '#8B5CF6', bg: '#F5F3FF' },
  Ticket: { tint: '#10B981', bg: '#ECFDF5' },
  Grocery: { tint: '#EAB308', bg: '#FEFCE8' },
  Other: { tint: '#64748B', bg: '#F1F5F9' },
};

export function CategoryGrid({
  options,
  selectedId,
  onSelect,
}: {
  options: CategoryOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => {
        const active = selectedId === option.id;
        const palette = CATEGORY_COLORS[option.id] ?? CATEGORY_COLORS.Other;
        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={{
              width: '31%',
              alignItems: 'center',
              paddingVertical: 10,
              borderRadius: radii.md,
              backgroundColor: active ? colors.primary : colors.background,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: radii.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? 'rgba(255,255,255,0.2)' : palette.bg,
              }}
            >
              <Icon name={option.icon} size={18} color={active ? colors.white : palette.tint} strokeWidth={1.5} />
            </View>
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
