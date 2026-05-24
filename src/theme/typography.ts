import { TextStyle } from 'react-native';

import { colors } from './colors';

export const fontFamily = {
  regular: undefined,
  medium: undefined,
  semibold: undefined,
  bold: undefined,
} as const;

/** Typography scale */
export const typography = {
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    color: colors.textPrimary,
  } satisfies TextStyle,
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textSecondary,
  } satisfies TextStyle,
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textPrimary,
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    color: colors.textSecondary,
  } satisfies TextStyle,
  amountLarge: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  } satisfies TextStyle,

  /** Variants & legacy aliases */
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
    color: colors.textPrimary,
  } satisfies TextStyle,
  largeTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    color: colors.textPrimary,
  } satisfies TextStyle,
  headline: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    color: colors.textPrimary,
  } satisfies TextStyle,
  label: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  amount: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  } satisfies TextStyle,
  amountSm: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    color: colors.textPrimary,
  } satisfies TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
