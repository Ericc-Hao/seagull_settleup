/** Border radius scale (pt) */
export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;
