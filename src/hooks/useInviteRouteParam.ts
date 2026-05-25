import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { extractInviteTokenFromUrl } from '../lib/pendingInviteToken';

function resolveInviteParam(invite: string | string[] | undefined): string | undefined {
  if (typeof invite === 'string' && invite.trim()) {
    return invite.trim();
  }
  if (Array.isArray(invite)) {
    const first = invite.find((value) => value.trim());
    return first?.trim();
  }
  return undefined;
}

function readInviteTokenFromWebLocation(): string | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return undefined;
  }
  return extractInviteTokenFromUrl(window.location.href) ?? undefined;
}

/** Reads ?invite= from Expo Router params with a web URL fallback for static export. */
export function useInviteRouteParam(): string | undefined {
  const params = useLocalSearchParams<{ invite?: string | string[] }>();
  const paramToken = useMemo(() => resolveInviteParam(params.invite), [params.invite]);
  const [webToken, setWebToken] = useState<string | undefined>(() =>
    paramToken ? undefined : readInviteTokenFromWebLocation(),
  );

  useEffect(() => {
    if (paramToken) {
      setWebToken(undefined);
      return;
    }
    setWebToken(readInviteTokenFromWebLocation());
  }, [paramToken]);

  return paramToken ?? webToken;
}
