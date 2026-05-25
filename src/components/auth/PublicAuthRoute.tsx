import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useAuth } from '../../context/AuthContext';
import { AuthLoadingScreen } from '../../screens/AuthScreens';

export function PublicAuthRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Redirect href="/home" />;
  }

  return <>{children}</>;
}
