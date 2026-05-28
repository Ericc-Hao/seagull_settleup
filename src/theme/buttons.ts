import { TextStyle, ViewStyle } from 'react-native';

import { colors } from './colors';
import { radii } from './radii';
import { spacing } from './spacing';

const baseContainer: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 52,
  minWidth: 0,
  borderRadius: radii.lg,
  paddingVertical: spacing.lg - 2,
  paddingHorizontal: spacing.lg,
};

const baseLabel: TextStyle = {
  fontSize: 15,
  fontWeight: '700',
  lineHeight: 20,
  textAlign: 'center',
};

/** Shared button style presets */
export const buttons = {
  primary: {
    container: {
      ...baseContainer,
      backgroundColor: colors.primary,
      alignSelf: 'stretch',
    } satisfies ViewStyle,
    label: {
      ...baseLabel,
      color: colors.white,
    } satisfies TextStyle,
    iconColor: colors.white,
    pressedOpacity: 0.85,
    disabledOpacity: 0.55,
  },
  secondary: {
    container: {
      ...baseContainer,
      backgroundColor: colors.secondary,
      alignSelf: 'stretch',
    } satisfies ViewStyle,
    label: {
      ...baseLabel,
      color: colors.white,
    } satisfies TextStyle,
    iconColor: colors.white,
    pressedOpacity: 0.85,
    disabledOpacity: 0.55,
  },
  outline: {
    container: {
      ...baseContainer,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
    } satisfies ViewStyle,
    label: {
      ...baseLabel,
      color: colors.primary,
    } satisfies TextStyle,
    iconColor: colors.primary,
    pressedOpacity: 0.88,
    disabledOpacity: 0.5,
  },
  ghost: {
    container: {
      ...baseContainer,
      backgroundColor: 'transparent',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    } satisfies ViewStyle,
    label: {
      ...baseLabel,
      color: colors.textSecondary,
    } satisfies TextStyle,
    iconColor: colors.textSecondary,
    pressedOpacity: 0.7,
    disabledOpacity: 0.4,
  },
  danger: {
    container: {
      ...baseContainer,
      backgroundColor: colors.danger,
    } satisfies ViewStyle,
    label: {
      ...baseLabel,
      color: colors.white,
    } satisfies TextStyle,
    iconColor: colors.white,
    pressedOpacity: 0.88,
    disabledOpacity: 0.5,
  },
} as const;

export type ButtonVariant = keyof typeof buttons;
