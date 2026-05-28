import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { BottomTabBar } from '../../src/components';
import { ProtectedRoute } from '../../src/components/auth/ProtectedRoute';
import { colors, layout } from '../../src/theme';

export default function TabsLayout() {
  return (
    <ProtectedRoute>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Tabs
          tabBar={(props) => <BottomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: {
              flex: 1,
              backgroundColor: colors.background,
            },
            tabBarStyle: {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              height: layout.bottomTabHeight + layout.tabBarPlusOverflow,
              zIndex: 9999,
              elevation: 9999,
            },
          }}
        >
          <Tabs.Screen name="home" options={{ title: 'Home' }} />
          <Tabs.Screen name="expenses" options={{ title: 'Expenses' }} />
          <Tabs.Screen name="groups" options={{ title: 'Groups' }} />
          <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
          <Tabs.Screen name="settlement" options={{ href: null }} />
          <Tabs.Screen name="settings" options={{ href: null }} />
        </Tabs>
      </View>
    </ProtectedRoute>
  );
}
