import { colors } from '../theme';

export const stackScreenOptions = {
  headerShown: false,
  contentStyle: {
    flex: 1,
    backgroundColor: colors.background,
  },
} as const;

export const modalStackScreenOptions = {
  ...stackScreenOptions,
  presentation: 'modal' as const,
};

export const groupStackScreenOptions = {
  ...stackScreenOptions,
  animation: 'slide_from_right' as const,
};
