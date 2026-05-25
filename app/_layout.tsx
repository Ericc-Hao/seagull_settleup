import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';
import { InviteTokenHandler } from '../src/components/invitations/InviteTokenHandler';
import { colors } from '../src/theme';
import { AppDataProvider } from '../src/context/AppDataContext';
import { NotificationsProvider } from '../src/context/NotificationsContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { extractInviteTokenFromUrl, setPendingInviteToken } from '../src/lib/pendingInviteToken';
import { modalStackScreenOptions, stackScreenOptions } from '../src/navigation/screenOptions';
import { AuthLoadingScreen } from '../src/screens/AuthScreens';

function InviteLinkListener() {
  useEffect(() => {
    const captureInviteToken = (url: string | null) => {
      if (!url) {
        return;
      }
      const token = extractInviteTokenFromUrl(url);
      if (token) {
        void setPendingInviteToken(token);
      }
    };

    void Linking.getInitialURL().then(captureInviteToken);
    const subscription = Linking.addEventListener('url', ({ url }) => captureInviteToken(url));
    return () => subscription.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={styles.root}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <AuthProvider>
          <InviteLinkListener />
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
        <InviteTokenHandler />
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
