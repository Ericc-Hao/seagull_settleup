import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { colors, layout, shadows, type ShadowToken } from '../../theme';

type ShadowSurfaceProps = {
  children: ReactNode;
  shadow?: ShadowToken;
  borderRadius?: number;
  backgroundColor?: string;
  overflowHidden?: boolean;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
};

/**
 * Cross-platform card shell: native shadow props on iOS/Android, boxShadow on web.
 * Keeps overflow clipping on an inner wrapper so iOS shadows are not clipped.
 */
export function ShadowSurface({
  children,
  shadow = 'cardSoft',
  borderRadius = layout.cardRadius,
  backgroundColor = colors.white,
  overflowHidden = false,
  style,
  innerStyle,
}: ShadowSurfaceProps) {
  const shadowStyle = shadows[shadow];

  if (overflowHidden) {
    return (
      <View style={[{ borderRadius }, shadowStyle, style]}>
        <View
          style={[
            {
              borderRadius,
              backgroundColor,
              overflow: 'hidden',
            },
            innerStyle,
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={[{ borderRadius }, shadowStyle, style]}>
      <View
        style={[
          {
            borderRadius,
            backgroundColor,
          },
          innerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
