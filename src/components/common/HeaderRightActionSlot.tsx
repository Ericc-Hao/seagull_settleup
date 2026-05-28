import { type ReactNode } from 'react';
import { View } from 'react-native';

import { headerLayout } from './headerLayout';

/** Fixed-size right header slot — keeps notification bell position stable across tabs. */
export function HeaderRightActionSlot({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <View
      style={{
        width: wide ? headerLayout.headerActionsWidth : headerLayout.rightActionSize,
        height: headerLayout.rightActionSize,
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}
