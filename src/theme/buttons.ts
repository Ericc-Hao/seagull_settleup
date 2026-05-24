import { TextStyle, ViewStyle } from 'react-native';

import { colors } from './colors';
import { radii } from './radii';
import { spacing } from './spacing';
import { typography } from './typography';

const baseContainer: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacing.sm,
  borderRadius: radii.lg,
  paddingVertical: spacing.lg - 2,
  paddingHorizontal: spacing.xl,
};

const baseLabel: TextStyle = {
  ...typography.bodyMedium,
  fontWeight: '600',
};

/** Shared button style presets */
export const buttons = {
  primary: {
    container: {
      ...baseContainer,
      backgroundColor: colors.primary,
    } satisfies ViewStyle,
    label: {
      ...baseLabel,
      color: colors.white,
    } satisfies TextStyle,
    iconColor: colors.white,
    pressedOpacity: 0.88,
    disabledOpacity: 0.5,
  },
  secondary: {
    container: {
      ...baseContainer,
      backgroundColor: colors.secondary,
    } satisfies ViewStyle,
    label: {
      ...baseLabel,
      color: colors.white,
    } satisfies TextStyle,
    iconColor: colors.white,
    pressedOpacity: 0.88,
    disabledOpacity: 0.5,
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
