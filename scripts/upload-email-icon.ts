/**
 * Developer script: upload assets/icon.png to Supabase Storage for invitation emails.
 *
 * Usage:
 *   SUPABASE_URL=https://<project-ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
 *   npx tsx scripts/upload-email-icon.ts
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

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    console.error('Missing SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }

  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const iconBytes = readFileSync(LOCAL_ICON_PATH);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('Uploading email icon', { bucket: BUCKET, path: STORAGE_PATH });

  const { error } = await supabase.storage.from(BUCKET).upload(STORAGE_PATH, iconBytes, {
    contentType: 'image/png',
    upsert: true,
  });

  if (error) {
    console.error('Upload failed:', error.message);
    process.exit(1);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(STORAGE_PATH);
  const publicUrl = data.publicUrl;

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
