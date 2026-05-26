import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type AuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const noopStorage: AuthStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

function createWebStorage(): AuthStorage {
  if (typeof window === 'undefined') {
    return noopStorage;
  }

  return {
    getItem: async (key: string) => window.localStorage.getItem(key),
    setItem: async (key: string, value: string) => {
      window.localStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
      window.localStorage.removeItem(key);
    },
  };
}

function isWebRuntime(): boolean {
  return typeof Platform !== 'undefined' && Platform.OS === 'web';
}

export const authStorage: AuthStorage = isWebRuntime() ? createWebStorage() : AsyncStorage;

function isSupabaseAuthStorageKey(key: string): boolean {
  return key.startsWith('sb-') || key.includes('supabase.auth.token');
}

export async function clearSupabaseAuthStorage(): Promise<void> {
  if (isWebRuntime()) {
    if (typeof window === 'undefined') {
      return;
    }

    const keysToRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && isSupabaseAuthStorageKey(key)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
    return;
  }

  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(isSupabaseAuthStorageKey);
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
    }
  } catch {
    // Best-effort cleanup only.
  }
}
