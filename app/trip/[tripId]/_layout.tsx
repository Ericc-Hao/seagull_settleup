import { Stack } from 'expo-router';

export default function TripWorkspaceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="people" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="settlement" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="people/add" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
