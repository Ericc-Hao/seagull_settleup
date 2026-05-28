import { ViewStyle } from 'react-native';

import { colors } from './colors';
import { createShadowStyle } from './shadow-utils';

/** Shadow presets (web-safe via boxShadow) */
export const shadows = {
  none: {} satisfies ViewStyle,
  cardSoft: createShadowStyle({
    color: colors.primary,
    offset: { width: 0, height: 2 },
    opacity: 0.06,
    radius: 8,
    elevation: 2,
  }),
  card: createShadowStyle({
    color: '#5A64B4',
    offset: { width: 0, height: 8 },
    opacity: 0.12,
    radius: 18,
    elevation: 3,
  }),
  elevated: createShadowStyle({
    color: '#7B82F5',
    offset: { width: 0, height: 6 },
    opacity: 0.12,
    radius: 18,
    elevation: 5,
  }),
  fab: createShadowStyle({
    color: colors.primary,
    offset: { width: 0, height: 6 },
    opacity: 0.35,
    radius: 12,
    elevation: 8,
  }),
} as const;

export type ShadowToken = keyof typeof shadows;
