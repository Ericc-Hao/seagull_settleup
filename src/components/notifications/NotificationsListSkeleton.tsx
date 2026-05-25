import { View } from 'react-native';

import { colors, layout } from '../../theme';

function SkeletonLine({ width, height = 12 }: { width: number | `${number}%`; height?: number }) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: colors.tertiary,
        opacity: 0.55,
      }}
    />
  );
}

export function NotificationsListSkeleton() {
  return (
    <View style={{ gap: layout.cardGap }}>
      {[0, 1].map((key) => (
        <View
          key={key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 14,
            paddingHorizontal: layout.cardPadding,
            backgroundColor: colors.white,
            borderRadius: layout.cardRadius,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.tertiary,
              opacity: 0.45,
            }}
          />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonLine width="45%" height={14} />
            <SkeletonLine width="85%" />
            <SkeletonLine width="30%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}
