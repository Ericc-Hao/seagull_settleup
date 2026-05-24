import { ReactNode } from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout } from '../theme';

export function ScreenLayout({
  children,
  header,
  footer,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
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
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: layout.screenPadding,
        paddingBottom: layout.scrollBottomPadding,
        flexGrow: 1,
      }}
    >
      {content}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingHorizontal: layout.screenPadding }}>{content}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      {header}
      {body}
      {footer ? <View style={{ backgroundColor: colors.background }}>{footer}</View> : null}
    </SafeAreaView>
  );
}
