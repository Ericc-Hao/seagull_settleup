import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from './icon';
import { createShadowStyle, shadows } from '../theme';
import { BRAND } from './theme';

const tabBarShadow = createShadowStyle({
  color: '#7B82F5',
  offset: { width: 0, height: -2 },
  opacity: 0.08,
  radius: 14,
  elevation: 3,
});

const ORDER = ['home', 'expenses', 'groups', 'profile'] as const;

const TAB_CONFIG: Record<(typeof ORDER)[number], { label: string; icon: IconName; iconActive: IconName }> = {
  home: { label: 'Home', icon: 'home', iconActive: 'home' },
  expenses: { label: 'Expenses', icon: 'clipboard-list', iconActive: 'clipboard-list' },
  groups: { label: 'Groups', icon: 'user-group', iconActive: 'user-group' },
  profile: { label: 'Profile', icon: 'user', iconActive: 'user' },
};

interface TabRoute {
  key: string;
  name: string;
}

interface MainTabBarProps {
  state: { index: number; routes: TabRoute[] };
  navigation: { navigate: (name: (typeof ORDER)[number]) => void };
}

export function MainTabBar({ state, navigation }: MainTabBarProps) {
  const insets = useSafeAreaInsets();
  const focusedName = state.routes[state.index]?.name;

  const renderTab = (routeName: (typeof ORDER)[number]) => {
    const config = TAB_CONFIG[routeName];
    const route = state.routes.find((r: TabRoute) => r.name === routeName);
    if (!route) return <View key={routeName} className="flex-1" />;

    const focused = focusedName === routeName;
    const color = focused ? BRAND.lavender : BRAND.muted;

    return (
      <Pressable
        key={route.key}
        onPress={() => navigation.navigate(routeName)}
        className="min-w-[56px] flex-1 items-center gap-1 py-1"
      >
        <Icon name={config.icon} size={24} color={color} solid={focused && routeName === 'home'} />
        <Text className={`text-[11px] font-semibold`} style={{ color }}>
          {config.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      className="border-t border-brand-100 bg-white px-1 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12), ...tabBarShadow }}
    >
      <View className="flex-row items-end">
        {renderTab('home')}
        {renderTab('expenses')}
        <View className="items-center px-1" style={{ width: 72 }}>
          <Pressable
            onPress={() => router.push('/create-trip')}
            className="-mt-10 h-[58px] w-[58px] items-center justify-center rounded-full bg-brand-300"
            style={shadows.fab}
          >
            <Icon name="plus" size={28} color="#FFFFFF" solid />
          </Pressable>
        </View>
        {renderTab('groups')}
        {renderTab('profile')}
      </View>
    </View>
  );
}
