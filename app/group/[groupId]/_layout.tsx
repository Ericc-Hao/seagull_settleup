import { Stack } from 'expo-router';

export default function GroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="add-expense" />
      <Stack.Screen name="settle-up" />
    </Stack>
  );
}
