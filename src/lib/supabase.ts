import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { authStorage } from './authStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const isWeb = typeof document !== 'undefined';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    // PKCE is required for the password-recovery code-exchange flow on web.
    flowType: 'pkce',
    // On web, let Supabase parse the `?code=` returned to /reset-password.
    detectSessionInUrl: isWeb,
  },
});
