import { buttons } from './buttons';
import { cards } from './cards';
import { colors } from './colors';
import { layout } from './layout';
import { screenBackgroundStyle } from './screen';
import { fontFamily, typography } from './typography';
import { radii } from './radii';
import { shadows } from './shadows';
import { spacing } from './spacing';

/**
 * Unified design system — import granular tokens or the full `theme` object.
 *
 * @example
 * import { theme } from '@/theme';
 * <View style={theme.cards.default} />
 */
export const theme = {
  colors,
  typography,
  fontFamily,
  spacing,
  layout,
  radii,
  shadows,
  buttons,
  cards,
  screenBackgroundStyle,
} as const;

export type Theme = typeof theme;
