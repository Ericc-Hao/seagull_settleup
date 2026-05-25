/**
 * Developer script: upload assets/icon.png to Supabase Storage for invitation emails.
 *
 * Usage:
 *   SUPABASE_URL=https://yljcebabixdakgwsvqtm.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
 *   npm run upload:email-icon
 *
 * Then set the Edge Function secret:
 *   npx supabase secrets set EMAIL_ICON_URL=<printed-public-url>
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'public-assets';
const STORAGE_PATH = 'brand/icon.png';
const LOCAL_ICON_PATH = resolve(process.cwd(), 'assets/icon.png');

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function validateServiceRoleKey(key: string): void {
  if (key.startsWith('re_')) {
    console.error('Invalid SUPABASE_SERVICE_ROLE_KEY: this looks like a Resend API key (re_...).');
    console.error('Use the Supabase service_role secret from Dashboard → Project Settings → API.');
    process.exit(1);
  }

  if (key.startsWith('sb_publishable_')) {
    console.error('Invalid SUPABASE_SERVICE_ROLE_KEY: this is the publishable key, not the service role key.');
    console.error('Use the service_role secret from Dashboard → Project Settings → API.');
    process.exit(1);
  }

  const looksLikeJwt = key.startsWith('eyJ');
  const looksLikeSecretKey = key.startsWith('sb_secret_');
  if (!looksLikeJwt && !looksLikeSecretKey) {
    console.error('Invalid SUPABASE_SERVICE_ROLE_KEY format.');
    console.error('Expected a JWT (eyJ...) or sb_secret_... key from Supabase Dashboard → Project Settings → API.');
    process.exit(1);
  }
}

async function verifyPublicUrl(publicUrl: string): Promise<void> {
  const response = await fetch(publicUrl, {
    method: 'GET',
    headers: { Range: 'bytes=0-0' },
  });

  if (!response.ok && response.status !== 206) {
    console.error(`Public URL check failed (${response.status}): ${publicUrl}`);
    console.error('Verify the public-assets bucket is public and brand/icon.png exists.');
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    console.error('Missing SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }

  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  validateServiceRoleKey(serviceRoleKey);
  const iconBytes = readFileSync(LOCAL_ICON_PATH);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('Uploading email icon', { bucket: BUCKET, path: STORAGE_PATH });

  const { error } = await supabase.storage.from(BUCKET).upload(STORAGE_PATH, iconBytes, {
    contentType: 'image/png',
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    console.error('Upload failed:', error.message);
    if (error.message.includes('Invalid Compact JWS') || error.message.includes('JWT')) {
      console.error('');
      console.error('The service role key is invalid. Common mistakes:');
      console.error('- Using RESEND_API_KEY (re_...) instead of Supabase service_role');
      console.error('- Using the publishable/anon key instead of service_role');
      console.error('');
      console.error('Get the correct key: Supabase Dashboard → Project Settings → API → service_role');
    }
    console.error('Ensure the public-assets bucket exists. Run: npx supabase db push');
    process.exit(1);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(STORAGE_PATH);
  const publicUrl = data.publicUrl;

  await verifyPublicUrl(publicUrl);

  console.log('Upload succeeded');
  console.log(`Public URL: ${publicUrl}`);
  console.log('');
  console.log('Set the Edge Function secret:');
  console.log(`npx supabase secrets set EMAIL_ICON_URL=${publicUrl}`);
  console.log('');
  console.log('Redeploy:');
  console.log('npx supabase functions deploy send-group-invitation');
}

main().catch((error) => {
  console.error('Upload failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
