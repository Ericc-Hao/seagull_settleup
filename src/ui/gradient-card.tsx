import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { View } from 'react-native';

import { BRAND, SHADOW } from './theme';

interface GradientCardProps {
  children: ReactNode;
  className?: string;
}

export function GradientCard({ children, className = '' }: GradientCardProps) {
  return (
    <View className={`overflow-hidden rounded-[28px] ${className}`} style={SHADOW}>
      <LinearGradient
        colors={[BRAND.lavender, '#8EC5FF', BRAND.pastelBlue]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        className="p-5"
      >
        {children}
      </LinearGradient>
    </View>
  );
}
