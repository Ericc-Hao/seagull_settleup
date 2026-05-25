import { ReactNode } from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';

import { colors, layout } from '../theme';
import { ScreenContainer } from './layout/ScreenContainer';

export function ScreenLayout({
  children,
  header,
  footer,
  scroll = true,
  contentStyle,
  bottomTabPadding = true,
}: {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  bottomTabPadding?: boolean;
}) {
  const content = (
    <View
      style={[
        {
          width: '100%',
          gap: layout.sectionGap,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: layout.screenPadding,
        paddingBottom: bottomTabPadding ? layout.scrollBottomPadding : layout.sectionGap,
        flexGrow: 1,
        backgroundColor: colors.background,
      }}
    >
      {content}
    </ScrollView>
  ) : (
    <View
      style={{
        flex: 1,
        paddingHorizontal: layout.screenPadding,
        backgroundColor: colors.background,
      }}
    >
      {content}
    </View>
  );

  return (
    <ScreenContainer scrollable={false}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {header ? <View style={{ backgroundColor: colors.background }}>{header}</View> : null}
        {body}
        {footer ? <View style={{ backgroundColor: colors.background }}>{footer}</View> : null}
      </View>
    </ScreenContainer>
  );
}
