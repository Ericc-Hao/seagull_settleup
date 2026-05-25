import { Pressable, Text, View } from 'react-native';

import { GROUP_TYPE_OPTIONS } from '../../data/constants';
import { colors, radii, typography } from '../../theme';
import type { GroupType } from '../../types/models';

export function GroupTypeSelector({
  value,
  onChange,
}: {
  value: GroupType;
  onChange: (type: GroupType) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {GROUP_TYPE_OPTIONS.map((option) => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={{
              width: '31%',
              paddingVertical: 12,
              borderRadius: radii.md,
              alignItems: 'center',
              backgroundColor: active ? colors.primary : colors.background,
            }}
          >
            <Text
              style={[
                typography.caption,
                { fontWeight: '600', color: active ? colors.white : colors.textSecondary },
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
