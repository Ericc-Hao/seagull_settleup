import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useInviteRouteParam } from '../../hooks/useInviteRouteParam';
import { setPendingInviteToken } from '../../lib/pendingInviteToken';
import { AuthLoadingScreen } from '../../screens/AuthScreens';

export function PublicAuthRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const inviteToken = useInviteRouteParam();

  useEffect(() => {
    if (inviteToken) {
      void setPendingInviteToken(inviteToken);
    }
  }, [inviteToken]);

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Redirect href="/home" />;
  }

  return <>{children}</>;
}
