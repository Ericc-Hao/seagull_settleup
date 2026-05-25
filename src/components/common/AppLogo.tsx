import { Image, ImageStyle, StyleProp } from 'react-native';

import appIcon from '../../../assets/icon.png';

export function AppLogo({
  size = 48,
  rounded = true,
  style,
}: {
  size?: number;
  rounded?: boolean;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={appIcon}
      style={[
        {
          width: size,
          height: size,
          borderRadius: rounded ? size * 0.28 : 0,
        },
        style,
      ]}
      resizeMode="cover"
      accessibilityLabel="Seagull Split"
    />
  );
}
