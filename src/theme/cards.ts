import { ViewStyle } from 'react-native';

import { colors } from './colors';
import { layout } from './layout';
import { shadows } from './shadows';

const baseCard: ViewStyle = {
  width: '100%',
  backgroundColor: colors.white,
  borderRadius: layout.cardRadius,
  padding: layout.cardPadding,
  ...shadows.cardSoft,
};

/** Shared card style presets */
export const cards = {
  default: { ...baseCard } satisfies ViewStyle,
  elevated: {
    ...baseCard,
    ...shadows.card,
  } satisfies ViewStyle,
  muted: {
    width: '100%',
    backgroundColor: colors.tertiary,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
  } satisfies ViewStyle,
  section: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    overflow: 'hidden',
    ...shadows.cardSoft,
  } satisfies ViewStyle,
  inset: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: layout.cardRadius - 6,
    paddingHorizontal: layout.cardPadding - 2,
    paddingVertical: layout.cardPadding - 2,
  } satisfies ViewStyle,
  selectable: (selected: boolean) =>
    ({
      ...baseCard,
      borderWidth: selected ? 2 : 1,
      borderColor: selected ? colors.primary : colors.borderSubtle,
    }) satisfies ViewStyle,
} as const;

export type CardPreset = keyof Omit<typeof cards, 'selectable'>;
