import { ReactNode } from 'react';
import { View } from 'react-native';

import { shadows } from '../theme';

export function SurfaceCard({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <View
      className={`rounded-3xl bg-white ${padded ? 'p-4' : ''} ${className}`}
      style={shadows.card}
    >
      {children}
    </View>
  );
}
