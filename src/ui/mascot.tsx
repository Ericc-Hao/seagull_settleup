import { Text, View } from 'react-native';

import { createShadowStyle } from '../theme';

const mascotShadow = createShadowStyle({
  color: '#1E2A5A',
  offset: { width: 0, height: 2 },
  opacity: 0.12,
  radius: 8,
  elevation: 3,
});

/** Placeholder for the 3D seagull mascot in mockups */
export function Mascot({ size = 52 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <View
        className="absolute z-10 rounded-full bg-rose-500"
        style={{ width: size * 0.55, height: size * 0.22, top: -size * 0.08 }}
      />
      <View
        className="items-center justify-center rounded-full bg-white"
        style={[{ width: size, height: size }, mascotShadow]}
      >
        <Text style={{ fontSize: size * 0.42 }}>🐦</Text>
      </View>
    </View>
  );
}
