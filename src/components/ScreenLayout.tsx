import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, screenBackgroundStyle, spacing } from '../theme';
import { VStack } from './layout/Stack';
import { ScreenContainer } from './layout/ScreenContainer';

export function ScreenLayout({
  children,
  header,
  footer,
  scroll = true,
  contentStyle,
  bottomTabPadding = true,
  keyboardAvoiding = false,
  scrollBottomPadding,
}: {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  bottomTabPadding?: boolean;
  keyboardAvoiding?: boolean;
  scrollBottomPadding?: number;
}) {
  const insets = useSafeAreaInsets();
  const contentGap =
    typeof contentStyle?.gap === 'number' ? contentStyle.gap : layout.sectionGap;
  const { gap: _gap, ...restContentStyle } = contentStyle ?? {};

  const content = (
    <VStack
      gap={contentGap}
      style={[{ alignSelf: 'stretch', flex: scroll ? undefined : 1 }, restContentStyle]}
    >
      {children}
    </VStack>
  );

  const tabBarClearance = Math.max(
    layout.bottomTabHeight + insets.bottom + 96,
    layout.bottomTabHeight + 120,
    170,
  );

  const resolvedScrollBottomPadding =
    scrollBottomPadding ??
    (bottomTabPadding
      ? tabBarClearance
      : keyboardAvoiding
        ? spacing['4xl'] + insets.bottom
        : scroll
          ? spacing['4xl'] + insets.bottom
          : layout.sectionGap);

  const scrollContentStyle = {
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.headerTopPadding,
    paddingBottom: resolvedScrollBottomPadding,
    flexGrow: 1,
    backgroundColor: colors.background,
  };

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={scrollContentStyle}
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

  const layoutBody = (
    <View style={screenBackgroundStyle}>
      {header ? <View style={{ backgroundColor: colors.background }}>{header}</View> : null}
      {body}
      {footer ? <View style={{ backgroundColor: colors.background }}>{footer}</View> : null}
    </View>
  );

  return (
    <ScreenContainer scrollable={false} bottomTabPadding={false}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={screenBackgroundStyle}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
          {layoutBody}
        </KeyboardAvoidingView>
      ) : (
        layoutBody
      )}
    </ScreenContainer>
  );
}
