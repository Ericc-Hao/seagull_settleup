import { Pressable, Text, View } from 'react-native';

import { buttons, spacing } from '../theme';
import { Icon, IconName } from './Icon';
import { SecondaryButton } from './SecondaryButton';

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const preset = buttons.primary;
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

export function PrimaryButtonRow({
  left,
  right,
}: {
  left: { label: string; icon?: IconName; onPress: () => void };
  right: { label: string; icon?: IconName; onPress: () => void };
}) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <PrimaryButton label={left.label} icon={left.icon} onPress={left.onPress} />
      </View>
      <View style={{ flex: 1 }}>
        <SecondaryButton label={right.label} icon={right.icon} onPress={right.onPress} variant="filled" />
      </View>
    </View>
  );
}
