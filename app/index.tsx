import { Redirect } from 'expo-router';

import { useAuth } from '../src/context/AuthContext';

export default function IndexRoute() {
  const { session } = useAuth();

  return <Redirect href={session ? '/(tabs)/home' : '/(auth)/welcome'} />;
}
