import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';
import { colors } from '../src/theme';
import { TripsProvider } from '../src/state/trips-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider style={styles.root}>
      <View style={styles.root}>
        <TripsProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="create-group" options={{ presentation: 'modal' }} />
          </Stack>
        </TripsProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
