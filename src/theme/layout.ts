/**
 * Shared screen layout constants — use across all tab and stack screens.
 */
export const layout = {
  screenPadding: 20,
  sectionGap: 24,
  cardGap: 14,
  cardPadding: 18,
  cardRadius: 22,
  bottomTabHeight: 72,
  scrollBottomPadding: 120,
  tabBarInset: 16,
  tabBarRadius: 28,
  headerTopPadding: 8,
  headerBottomPadding: 16,
} as const;

export type LayoutToken = keyof typeof layout;
