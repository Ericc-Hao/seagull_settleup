import { Pressable, Text, View } from 'react-native';

import { colors, layout, shadows, typography } from '../theme';
import { Icon, IconName } from './Icon';

const cardBaseStyle = {
  flex: 1,
  alignItems: 'center' as const,
  gap: 8,
  backgroundColor: colors.white,
  borderRadius: layout.cardRadius,
  paddingVertical: layout.cardPadding - 4,
  paddingHorizontal: 4,
  borderWidth: 1,
  borderColor: colors.borderSubtle,
};

export function QuickActionCard({
  label,
  icon,
  tint,
  background,
  onPress,
}: {
  label: string;
  icon: IconName;
  tint: string;
  background: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [cardBaseStyle, shadows.cardSoft, { opacity: pressed ? 0.9 : 1 }]}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={20} color={tint} strokeWidth={1.5} />
      </View>
      <Text
        style={[typography.caption, { textAlign: 'center', fontSize: 10, lineHeight: 13, fontWeight: '600' }]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}
