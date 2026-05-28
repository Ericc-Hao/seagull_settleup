import { Image, ImageStyle, StyleProp } from 'react-native';

import appIcon from '../../../assets/icon.png';

export function AppLogo({
  size = 72,
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
      resizeMode="cover"
      style={[
        {
          width: size,
          height: size,
          borderRadius: rounded ? size * 0.28 : 0,
        },
        style,
      ]}
      accessibilityLabel="Seagull Split"
    />
  );
}
