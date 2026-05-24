import { Platform, ViewStyle } from 'react-native';

export type ShadowConfig = {
  color: string;
  offset: { width: number; height: number };
  opacity: number;
  radius: number;
  elevation?: number;
};

function hexToRgba(hex: string, alpha: number): string | null {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shadowColorWithOpacity(color: string, opacity: number): string {
  if (color.startsWith('rgba')) return color;
  if (color.startsWith('#')) {
    return hexToRgba(color, opacity) ?? `rgba(0, 0, 0, ${opacity})`;
  }
  return `rgba(0, 0, 0, ${opacity})`;
}

/**
 * Cross-platform shadow: `boxShadow` on web, native shadow* + elevation elsewhere.
 * Avoids RN Web deprecation: "shadow* style props are deprecated. Use boxShadow".
 */
export function createShadowStyle({
  color,
  offset,
  opacity,
  radius,
  elevation = 0,
}: ShadowConfig): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `${offset.width}px ${offset.height}px ${radius}px ${shadowColorWithOpacity(color, opacity)}`,
    } as ViewStyle;
  }

  return {
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}
