import { Pressable, Text, View } from 'react-native';

import { colors, radii, shadows, typography } from '../../theme';

export function SegmentedPill<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.lg,
        padding: 4,
      }}
    >
      {options.map((option) => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: radii.md,
              alignItems: 'center',
              backgroundColor: active ? colors.primary : 'transparent',
            }}
          >
            <Text
              style={[
                typography.bodyMedium,
                {
                  fontSize: 14,
                  color: active ? colors.white : colors.textSecondary,
                },
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

/** Equal / Custom style — white active pill on muted track */
export function SegmentedPillLight<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.lg,
        padding: 4,
      }}
    >
      {options.map((option) => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: radii.md,
              alignItems: 'center',
              backgroundColor: active ? colors.white : 'transparent',
              ...(active ? shadows.cardSoft : {}),
            }}
          >
            <Text
              style={[
                typography.bodyMedium,
                { fontSize: 14, color: active ? colors.textPrimary : colors.textSecondary },
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
