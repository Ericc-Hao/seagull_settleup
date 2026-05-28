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
  /** Height the center FAB extends above the tab bar shell. */
  tabBarPlusOverflow: 40,
  /** Extra scroll padding below tab content (added to tab bar + FAB + safe area). */
  tabBarScrollExtra: 48,
  /** Legacy minimum scroll padding when safe area is unavailable. */
  scrollBottomPadding: 152,
  /** Full-width bar — top corners only (see BottomTabBar). */
  tabBarTopRadius: 24,
  /** @deprecated Floating pill inset — bar is full width. */
  tabBarInset: 0,
  /** @deprecated Use tabBarTopRadius for full-width bar. */
  tabBarRadius: 24,
  headerTopPadding: 8,
  headerBottomPadding: 16,
} as const;

export type LayoutToken = keyof typeof layout;
