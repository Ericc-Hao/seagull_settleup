/**
 * @deprecated Import from `src/theme` instead.
 * Re-exports for legacy UI components under `src/ui/`.
 */
import { colors, shadows } from '../theme';

export const BRAND = {
  lavender: colors.primary,
  pastelBlue: colors.secondary,
  palePeriwinkle: colors.tertiary,
  alice: colors.background,
  navy: colors.textPrimary,
  muted: colors.textSecondary,
  success: colors.success,
  successBg: colors.successSoft,
  danger: colors.danger,
  dangerBg: colors.dangerSoft,
  warning: '#F97316',
  warningBg: '#FFF7ED',
} as const;

export const SHADOW = shadows.card;

export const AVATAR_COLORS = ['#AAC4FF', '#B1B2FF', '#7DD3A8', '#F5B87A', '#C4B5FD', '#FDA4AF'];

