import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';
import { colors } from '../src/theme';
import { AppDataProvider } from '../src/context/AppDataContext';
import { NotificationsProvider } from '../src/context/NotificationsContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { modalStackScreenOptions, stackScreenOptions } from '../src/navigation/screenOptions';
import { AuthLoadingScreen } from '../src/screens/AuthScreens';

export default function RootLayout() {
  return (
    <SafeAreaProvider style={styles.root}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return (
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="(auth)" />
      </Stack>
    );
  }

  return (
    <AppDataProvider>
      <NotificationsProvider>
        <Stack screenOptions={stackScreenOptions}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="create-group" options={modalStackScreenOptions} />
          <Stack.Screen name="add-expense" options={modalStackScreenOptions} />
          <Stack.Screen name="expense" />
          <Stack.Screen name="edit-profile" options={modalStackScreenOptions} />
          <Stack.Screen name="group/[groupId]" />
        </Stack>
      </NotificationsProvider>
    </AppDataProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
