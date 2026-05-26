import { Redirect } from 'expo-router';

import { useAuth } from '../src/context/AuthContext';
import { AuthLoadingScreen } from '../src/screens/AuthScreens';

export default function IndexRoute() {
  const { isAuthenticated, loading, authInitialized } = useAuth();

  if (loading || !authInitialized) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  return <Redirect href="/home" />;
}
