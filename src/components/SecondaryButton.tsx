import { Pressable, Text } from 'react-native';

import { buttons } from '../theme';
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
      style={({ pressed }) => [
        preset.container,
        {
          opacity: disabled ? preset.disabledOpacity : pressed ? preset.pressedOpacity : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
      ]}
    >
      {icon ? <Icon name={icon} size={20} color={preset.iconColor} /> : null}
      <Text style={preset.label}>{label}</Text>
    </Pressable>
  );
}
