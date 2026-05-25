/** Shared header layout tokens — keep notification icon position stable across screens. */
export const headerLayout = {
  horizontalPadding: 20,
  topPadding: 8,
  bottomPadding: 16,
  rightActionSize: 44,
  leftActionSize: 44,
  iconSize: 22,
  badgeMinWidth: 16,
  badgeHeight: 16,
  badgeTop: 4,
  badgeRight: 4,
  headerActionsGap: 8,
  /** Width reserved for two header action buttons (mark read + clear). */
  headerActionsWidth: 44 * 2 + 8,
} as const;
