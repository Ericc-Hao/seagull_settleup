import { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AppScreen({
  children,
  footer,
  header,
  noPadding = false,
}: {
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
  noPadding?: boolean;
}) {
  return (
    <SafeAreaView className="flex-1 bg-brand-50" edges={['top']}>
      {header}
      <ScrollView
        className="flex-1"
        contentContainerClassName={noPadding ? 'pb-32' : 'gap-5 px-4 pb-32 pt-1'}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View className="absolute bottom-0 left-0 right-0 bg-brand-50" style={{ paddingBottom: 0 }}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
