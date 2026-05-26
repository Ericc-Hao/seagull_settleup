import { Pressable, Text, View } from 'react-native';

import { buttons, colors, spacing } from '../theme';
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
              backgroundColor: colors.primary,
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

export function PrimaryButtonRow({
  left,
  right,
}: {
  left: { label: string; icon?: IconName; onPress: () => void };
  right: { label: string; icon?: IconName; onPress: () => void };
}) {
  return (
    <View style={{ flexDirection: 'row', width: '100%' }}>
      <View style={{ width: '50%', paddingRight: 6, minWidth: 0 }}>
        <PrimaryButton label={left.label} icon={left.icon} onPress={left.onPress} />
      </View>
      <View style={{ width: '50%', paddingLeft: 6, minWidth: 0 }}>
        <SecondaryButton label={right.label} icon={right.icon} onPress={right.onPress} variant="filled" />
      </View>
    </View>
  );
}
