import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from './icon';
import { Mascot } from './mascot';
import { ScenicHeader } from './scenic-header';
import { shadows } from '../theme';
import { BRAND } from './theme';
import { safeBack } from '../utils/navigation';

export function PageHeader({
  title,
  subtitle,
  onBack,
  right,
  showMascot = true,
  showBell = false,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  showMascot?: boolean;
  showBell?: boolean;
}) {
  return (
    <ScenicHeader tall>
      <View className="flex-row items-start justify-between">
        <Pressable
          onPress={onBack ?? (() => safeBack('/(tabs)/home'))}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
          style={shadows.cardSoft}
        >
          <Icon name="chevron-left" size={22} color={BRAND.navy} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          {showBell ? (
            <View className="relative h-10 w-10 items-center justify-center rounded-full bg-white/90">
              <Icon name="bell" size={22} color={BRAND.navy} />
              <View className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
            </View>
          ) : null}
          {right ?? (showMascot ? <Mascot size={48} /> : null)}
        </View>
      </View>
      <View className="mt-3 pr-16">
        <Text className="text-[26px] font-bold leading-tight text-brand-navy">{title}</Text>
        {subtitle ? <Text className="mt-1 text-sm leading-5 text-brand-muted">{subtitle}</Text> : null}
      </View>
    </ScenicHeader>
  );
}
