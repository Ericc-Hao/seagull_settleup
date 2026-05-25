import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      EXPO_PUBLIC_SUPABASE_URL: 'https://yljcebabixdakgwsvqtm.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-key',
    },
  },
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, 'src/test/mocks/react-native.ts'),
      'react-native-url-polyfill/auto': path.resolve(__dirname, 'src/test/mocks/empty.ts'),
      '@react-native-async-storage/async-storage': path.resolve(
        __dirname,
        'src/test/mocks/async-storage.ts',
      ),
    },
  },
});
