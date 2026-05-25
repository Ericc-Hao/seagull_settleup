import { Pressable, Text, View } from 'react-native';

import type { SplitMethod } from '../../types/models';
import { colors, radii, typography } from '../../theme';

const OPTIONS: { id: SplitMethod; label: string }[] = [
  { id: 'equal', label: 'Equal' },
  { id: 'custom', label: 'Custom' },
];

export function SplitMethodSelector({
  value,
  onChange,
}: {
  value: SplitMethod;
  onChange: (method: SplitMethod) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {OPTIONS.map((option) => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: radii.md,
              backgroundColor: active ? colors.primary : colors.white,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.borderSubtle,
              alignItems: 'center',
            }}
          >
            <Text
              style={[
                typography.bodyMedium,
                { color: active ? colors.white : colors.textSecondary, fontWeight: '600' },
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
