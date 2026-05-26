import { ViewStyle } from 'react-native';

import { colors } from './colors';
import { layout } from './layout';
import { createShadowStyle } from './shadow-utils';

const baseCard: ViewStyle = {
  alignSelf: 'stretch',
  backgroundColor: colors.white,
  borderRadius: layout.cardRadius,
  padding: layout.cardPadding,
};

/** Shared card style presets — apply shadows on outer wrappers when overflow clipping is needed. */
export const cards = {
  default: {
    ...baseCard,
    ...createShadowStyle({
      color: colors.primary,
      offset: { width: 0, height: 2 },
      opacity: 0.06,
      radius: 8,
      elevation: 2,
    }),
  } satisfies ViewStyle,
  elevated: {
    ...baseCard,
    ...createShadowStyle({
      color: '#5A64B4',
      offset: { width: 0, height: 8 },
      opacity: 0.12,
      radius: 18,
      elevation: 3,
    }),
  } satisfies ViewStyle,
  muted: {
    alignSelf: 'stretch',
    backgroundColor: colors.tertiary,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
  } satisfies ViewStyle,
  section: {
    alignSelf: 'stretch',
    backgroundColor: colors.white,
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    ...createShadowStyle({
      color: colors.primary,
      offset: { width: 0, height: 2 },
      opacity: 0.06,
      radius: 8,
      elevation: 2,
    }),
  } satisfies ViewStyle,
  inset: {
    alignSelf: 'stretch',
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
      ...createShadowStyle({
        color: colors.primary,
        offset: { width: 0, height: 2 },
        opacity: 0.06,
        radius: 8,
        elevation: 2,
      }),
    }) satisfies ViewStyle,
} as const;

export type CardPreset = keyof Omit<typeof cards, 'selectable'>;
