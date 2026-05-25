import { Redirect } from 'expo-router';

import { useAuth } from '../src/context/AuthContext';
import { AuthLoadingScreen } from '../src/screens/AuthScreens';

export default function NotFound() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  return <Redirect href={isAuthenticated ? '/home' : '/welcome'} />;
}
