import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadows, typography } from '../theme';
import { createShadowStyle } from '../theme/shadow-utils';
import { createLogger } from '../utils/logger';
import { Icon, IconName } from './Icon';

const logger = createLogger('BottomTabBar');

const tabBarShadow = createShadowStyle({
  color: '#7B82F5',
  offset: { width: 0, height: -2 },
  opacity: 0.08,
  radius: 14,
  elevation: 3,
});

type TabName = 'home' | 'expenses' | 'groups' | 'profile';

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
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        elevation: 9999,
      }}
    >
      <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={[styles.tabBar, tabBarShadow]}>
          {renderTab('home', focusedName, navigation)}
          {renderTab('expenses', focusedName, navigation)}

          <View style={styles.tabSlot}>
            <Pressable
              onPress={() => {
                logger.info('Bottom tab plus pressed', { target: 'AddExpense' });
                router.push('/add-expense');
              }}
              accessibilityRole="button"
              accessibilityLabel="Add Expense"
              style={({ pressed }) => [
                styles.centerSlot,
                pressed && styles.pressedPlus,
                webPressableStyle,
              ]}
            >
              <View style={styles.plusCircle}>
                <Icon name="plus" size={28} color={colors.white} solid />
              </View>
            </Pressable>
          </View>

          {renderTab('groups', focusedName, navigation)}
          {renderTab('profile', focusedName, navigation)}
        </View>
      </View>
    </View>
  );
}

function renderTab(
  name: TabName,
  focused: TabName,
  navigation: BottomTabBarProps['navigation'],
) {
  const meta = TAB_META[name];
  const active = focused === name;
  const tint = active ? colors.primary : colors.textSecondary;

  return (
    <View key={name} style={styles.tabSlot}>
      <Pressable
        onPress={() => navigation.navigate(name)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [styles.normalTab, pressed && styles.pressedTab, webPressableStyle]}
      >
        <View style={styles.tabContent}>
          <View style={styles.tabIconBox}>
            <Icon name={meta.icon} size={20} color={tint} solid={active && name === 'home'} />
          </View>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              typography.caption,
              styles.tabLabel,
              { color: tint },
            ]}
          >
            {meta.label}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const webPressableStyle =
  Platform.OS === 'web' ? ({ borderWidth: 0, borderColor: 'transparent' } as const) : {};

const styles = StyleSheet.create({
  tabBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'center',
  },
  tabBar: {
    width: '100%',
    height: 64,
    borderRadius: 28,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'visible',
  },
  tabSlot: {
    width: '20%',
    minWidth: '20%',
    maxWidth: '20%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  normalTab: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  tabIconBox: {
    width: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    alignSelf: 'center',
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 12,
    marginTop: 3,
    fontWeight: '600',
  },
  centerSlot: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    ...webPressableStyle,
  },
  plusCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    ...shadows.fab,
  },
  pressedPlus: {
    opacity: 0.9,
  },
  pressedTab: {
    opacity: 0.7,
  },
});
