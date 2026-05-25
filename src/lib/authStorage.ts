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
