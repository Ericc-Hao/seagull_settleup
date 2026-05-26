import { Pressable, Text, View } from 'react-native';

import { buttons, spacing } from '../theme';
import { Icon, IconName } from './Icon';

export function SecondaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  fullWidth = true,
  variant = 'outline',
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  fullWidth?: boolean;
  variant?: 'outline' | 'filled';
}) {
  const preset = variant === 'filled' ? buttons.secondary : buttons.outline;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={{
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        minWidth: 0,
        width: fullWidth ? '100%' : undefined,
      }}
    >
      {({ pressed }) => (
        <View
          style={[
            preset.container,
            {
              minHeight: 48,
              minWidth: 0,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 14,
              overflow: 'hidden',
              opacity: disabled ? preset.disabledOpacity : pressed ? preset.pressedOpacity : 1,
              width: fullWidth ? '100%' : undefined,
            },
          ]}
        >
          {icon ? (
            <View style={{ marginRight: spacing.sm, flexShrink: 0 }}>
              <Icon name={icon} size={20} color={preset.iconColor} />
            </View>
          ) : null}
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[preset.label, { textAlign: 'center', flexShrink: 1, maxWidth: '100%' }]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
