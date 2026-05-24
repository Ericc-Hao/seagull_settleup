/** 4pt base spacing scale */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  screenX: 20,
  screenBottom: 120,
  cardPadding: 18,
  sectionGap: 24,
} as const;

export type SpacingToken = keyof typeof spacing;
