import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
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

function AuthenticatedShell({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <AppDataProvider>
      <NotificationsProvider>
        <InviteTokenHandler />
        {children}
      </NotificationsProvider>
    </AppDataProvider>
  );
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
  const { loading, authInitialized } = useAuth();

  if (loading || !authInitialized) {
    return <AuthLoadingScreen />;
  }

  return (
    <AuthenticatedShell>
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="create-group" options={modalStackScreenOptions} />
        <Stack.Screen name="add-expense" options={modalStackScreenOptions} />
        <Stack.Screen name="expense" />
        <Stack.Screen name="edit-profile" options={modalStackScreenOptions} />
        <Stack.Screen name="pending-transfers" />
        <Stack.Screen name="group/[groupId]" />
      </Stack>
    </AuthenticatedShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
