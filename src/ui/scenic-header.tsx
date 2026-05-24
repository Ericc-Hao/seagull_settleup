import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { View } from 'react-native';

import { BRAND } from './theme';

/** Soft sky + coast header band matching mockup illustrations */
export function ScenicHeader({ children, tall = false }: { children?: ReactNode; tall?: boolean }) {
  return (
    <View className={`relative overflow-hidden rounded-b-[28px] ${tall ? 'min-h-[148px]' : 'min-h-[108px]'}`}>
      <LinearGradient
        colors={['#D8E4FF', '#EEF1FF', BRAND.alice]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />
      <View className="absolute right-0 top-6 h-16 w-24 rounded-full bg-white/30" />
      <View className="absolute right-8 top-14 h-10 w-14 rounded-lg bg-white/50" />
      <View className="absolute right-20 top-10 h-8 w-10 rounded-md bg-brand-200/40" />
      <View className="absolute bottom-0 left-0 right-0 h-8 bg-brand-50" />
      {children ? <View className="relative z-10 px-4 pb-3 pt-2">{children}</View> : null}
    </View>
  );
}
