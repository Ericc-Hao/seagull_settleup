import { Text, View } from 'react-native';

import { colors, shadows } from '../theme';

const AVATAR_COLORS = ['#AAC4FF', '#B1B2FF', '#7DD3A8', '#C4B5FD', '#D2DAFF'];

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** User initial avatar */
export function SeagullAvatar({
  id,
  label,
  size = 48,
}: {
  id: string;
  label: string;
  size?: number;
}) {
  const letter = label.charAt(0).toUpperCase();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colorForId(id),
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.cardSoft,
      }}
    >
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: colors.textPrimary }}>{letter}</Text>
    </View>
  );
}

/** Brand seagull mascot — simple logo mark for headers & cards */
export function SeagullMascot({ size = 72 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.cardSoft,
      }}
    >
      <Text style={{ fontSize: size * 0.42 }}>🐦</Text>
    </View>
  );
}
