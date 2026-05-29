import { Platform } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

export const authErrorTextStyle = [
  typography.caption,
  { color: colors.danger, textAlign: 'center' as const, lineHeight: 18 },
];

export const authInputContainerStyle = {
  backgroundColor: colors.white,
  borderRadius: radii.lg,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm + 4,
  borderWidth: 1,
  borderColor: colors.borderSubtle,
  minHeight: 76,
} as const;

export const authInputContainerDisabledStyle = {
  backgroundColor: colors.borderSubtle,
  opacity: 0.85,
} as const;

export const authInputTextStyle = {
  padding: 0,
  margin: 0,
  minHeight: 24,
  ...(Platform.OS === 'android' ? { textAlignVertical: 'center' as const } : {}),
} as const;

export const authNoticeContainerStyle = {
  backgroundColor: colors.borderSubtle,
  borderRadius: radii.lg,
  padding: spacing.md,
} as const;
