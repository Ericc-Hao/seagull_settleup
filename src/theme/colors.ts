/**
 * Seagull Split — centralized color tokens
 * Palette: https://colorhunt.co/palette/b1b2ffaac4ffd2daffeef1ff
 */
export const colors = {
  /** Brand */
  primary: '#B1B2FF',
  secondary: '#AAC4FF',
  tertiary: '#D2DAFF',
  background: '#EEF1FF',
  white: '#FFFFFF',

  /** Text */
  textPrimary: '#1C2340',
  textSecondary: '#6B7AAB',
  textTertiary: '#9BA8C7',

  /** Semantic */
  success: '#5BB98A',
  successSoft: '#E8F8F0',
  danger: '#E8799A',
  dangerSoft: '#FFF0F3',

  /** Borders */
  border: 'rgba(177, 178, 255, 0.35)',
  borderSubtle: 'rgba(210, 218, 255, 0.8)',

  /** Legacy aliases — prefer primary / secondary / tertiary */
  primaryLight: '#AAC4FF',
  surfaceMuted: '#D2DAFF',
  owe: '#8B5CF6',
  oweSoft: '#F5F3FF',
} as const;

export type ColorToken = keyof typeof colors;
