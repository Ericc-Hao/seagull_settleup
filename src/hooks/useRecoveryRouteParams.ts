import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';

import {
  parseRecoveryLinkErrorFromUrl,
  parseRecoveryTokenHashFromUrl,
  type RecoveryLinkError,
} from '../services/authService';

function resolveParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const first = value.find((entry) => entry.trim());
    return first?.trim();
  }
  return undefined;
}

function readRecoveryTokenFromParams(
  tokenHash: string | string[] | undefined,
  type: string | string[] | undefined,
): string | null {
  const hash = resolveParam(tokenHash);
  const recoveryType = resolveParam(type);
  if (hash && recoveryType === 'recovery') {
    return hash;
  }
  return null;
}

function readRecoveryLinkErrorFromWebLocation(): RecoveryLinkError | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  return parseRecoveryLinkErrorFromUrl(window.location.href);
}

/** Reads recovery token_hash/type from Expo Router params with native URL fallbacks. */
export function useRecoveryTokenHashParam(): string | null {
  const params = useLocalSearchParams<{ token_hash?: string | string[]; type?: string | string[] }>();
  const paramToken = useMemo(
    () => readRecoveryTokenFromParams(params.token_hash, params.type),
    [params.token_hash, params.type],
  );
  const [linkToken, setLinkToken] = useState<string | null>(() =>
    paramToken ? null : parseRecoveryTokenHashFromUrl(),
  );

  useEffect(() => {
    if (paramToken) {
      setLinkToken(null);
      return;
    }

    if (Platform.OS === 'web') {
      setLinkToken(parseRecoveryTokenHashFromUrl());
      return;
    }

    const captureToken = (url: string | null) => {
      if (!url) {
        return;
      }
      setLinkToken(parseRecoveryTokenHashFromUrl(url));
    };

    void Linking.getInitialURL().then(captureToken);
    const subscription = Linking.addEventListener('url', ({ url }) => captureToken(url));
    return () => subscription.remove();
  }, [paramToken]);

  return paramToken ?? linkToken;
}

/** Reads recovery link errors from the current URL on web and native deep links. */
export function useRecoveryLinkErrorParam(): RecoveryLinkError | null {
  const [linkError, setLinkError] = useState<RecoveryLinkError | null>(() =>
    readRecoveryLinkErrorFromWebLocation(),
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      setLinkError(readRecoveryLinkErrorFromWebLocation());
      return;
    }

    const captureError = (url: string | null) => {
      if (!url) {
        return;
      }
      setLinkError(parseRecoveryLinkErrorFromUrl(url));
    };

    void Linking.getInitialURL().then(captureError);
    const subscription = Linking.addEventListener('url', ({ url }) => captureError(url));
    return () => subscription.remove();
  }, []);

  return linkError;
}
