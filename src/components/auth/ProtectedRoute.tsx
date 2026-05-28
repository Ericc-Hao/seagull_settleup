import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useAuth } from '../../context/AuthContext';
import { AuthLoadingScreen } from '../../screens/AuthScreens';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, authInitialized } = useAuth();

  if (!authInitialized) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  return <>{children}</>;
}
