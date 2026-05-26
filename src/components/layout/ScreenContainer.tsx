import { ReactNode } from 'react';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, screenBackgroundStyle } from '../../theme';

export type ScreenContainerProps = {
  children: ReactNode;
  scrollable?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  withHorizontalPadding?: boolean;
  bottomTabPadding?: boolean;
};

export const screenRootStyle = screenBackgroundStyle;

export function ScreenContainer({
  children,
  scrollable = false,
  edges = ['top', 'left', 'right'],
  style,
  contentContainerStyle,
  withHorizontalPadding = false,
  bottomTabPadding = false,
}: ScreenContainerProps) {
  const paddingHorizontal = withHorizontalPadding ? layout.screenPadding : 0;
  const paddingBottom = bottomTabPadding ? layout.scrollBottomPadding : 0;

  if (scrollable) {
    return (
      <SafeAreaView style={[screenRootStyle, style]} edges={edges}>
        <ScrollView
          style={screenRootStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            {
              flexGrow: 1,
              paddingHorizontal,
              paddingBottom,
              backgroundColor: colors.background,
            },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[screenRootStyle, style]} edges={edges}>
      <View
        style={[
          screenRootStyle,
          {
            paddingHorizontal,
            paddingBottom,
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
