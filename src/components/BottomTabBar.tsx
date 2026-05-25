import { router } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, shadows, typography } from '../theme';
import { createLogger } from '../utils/logger';
import { Icon, IconName } from './Icon';

const logger = createLogger('BottomTabBar');

const TABS = ['home', 'expenses', 'groups', 'profile'] as const;
type TabName = (typeof TABS)[number];

const TAB_META: Record<TabName, { label: string; icon: IconName }> = {
  home: { label: 'Home', icon: 'home' },
  expenses: { label: 'Expenses', icon: 'clipboard-list' },
  groups: { label: 'Groups', icon: 'user-group' },
  profile: { label: 'Profile', icon: 'user' },
};

interface TabRoute {
  key: string;
  name: string;
}

interface BottomTabBarProps {
  state: { index: number; routes: TabRoute[] };
  navigation: { navigate: (name: TabName) => void };
}

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const focusedName = state.routes[state.index]?.name as TabName;

  return (
    <View
      style={{
        position: 'absolute',
        left: layout.tabBarInset,
        right: layout.tabBarInset,
        bottom: insets.bottom + 8,
        height: layout.bottomTabHeight,
        pointerEvents: 'box-none',
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.white,
          borderRadius: layout.tabBarRadius,
          paddingHorizontal: 6,
          ...shadows.card,
        }}
      >
        {renderTab('home', focusedName, navigation)}
        {renderTab('expenses', focusedName, navigation)}
        <View style={{ width: 64, alignItems: 'center' }}>
          <Pressable
            onPress={() => {
              logger.info('Bottom tab plus pressed', { target: 'AddExpense' });
              router.push('/add-expense');
            }}
            style={({ pressed }) => ({
              marginTop: -28,
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.9 : 1,
              ...shadows.fab,
              ...webPressableStyle,
            })}
          >
            <Icon name="plus" size={26} color={colors.white} solid />
          </Pressable>
        </View>
        {renderTab('groups', focusedName, navigation)}
        {renderTab('profile', focusedName, navigation)}
      </View>
    </View>
  );
}

function renderTab(name: TabName, focused: TabName, navigation: BottomTabBarProps['navigation']) {
  const meta = TAB_META[name];
  const active = focused === name;
  const tint = active ? colors.primary : colors.textSecondary;

  return (
    <Pressable
      key={name}
      onPress={() => navigation.navigate(name)}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 0,
        backgroundColor: 'transparent',
        opacity: pressed ? 0.7 : 1,
        ...webPressableStyle,
      })}
    >
      <Icon name={meta.icon} size={22} color={tint} solid={active && name === 'home'} />
      <Text style={[typography.caption, { fontSize: 10, fontWeight: '600', color: tint }]}>{meta.label}</Text>
    </Pressable>
  );
}

const webPressableStyle =
  Platform.OS === 'web' ? ({ borderWidth: 0, borderColor: 'transparent' } as const) : {};
