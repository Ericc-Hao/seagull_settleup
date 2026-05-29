import { getCachedUserId } from '../lib/auth';
import { mapProfile } from '../lib/mappers';
import { supabase } from '../lib/supabase';
import type { UpdateProfileInput } from '../types/inputs';
import type { Profile } from '../types/models';
import { createLogger } from '../utils/logger';
import { maskEmail } from '../utils/validation';
import { readDb } from './dbHelpers';

const logger = createLogger('profileService');

export function getProfile(userId: string = getCachedUserId()): Profile | undefined {
  return readDb().profiles.find((profile) => profile.userId === userId);
}

function emailPrefix(email?: string | null): string {
  return email?.split('@')[0]?.trim() || 'User';
}

export function getAvatarUrl(avatarUrl?: string | null): string | undefined {
  if (!avatarUrl?.trim()) {
    return undefined;
  }
  const trimmed = avatarUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(trimmed);
  return data.publicUrl || trimmed;
}

export async function findProfileByEmail(email: string): Promise<Profile | null> {
  const normalizedEmail = email.trim().toLowerCase();
  logger.debug('Find profile by email started', { email: maskEmail(normalizedEmail), table: 'profiles' });
  try {
    const { data, error } = await supabase.rpc('find_profile_by_email', {
      search_email: normalizedEmail,
    });
    if (error) {
      throw error;
    }
    const first = Array.isArray(data) ? data[0] : null;
    logger.debug('Find profile by email succeeded', {
      email: maskEmail(normalizedEmail),
      found: Boolean(first),
      table: 'profiles',
    });
    return first ? mapProfile(first) : null;
  } catch (error) {
    logger.error('Find profile by email failed', error, {
      email: maskEmail(normalizedEmail),
      table: 'profiles',
    });
    throw error;
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  logger.info('Get current profile started', { table: 'profiles' });
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw userError;
    }
    const user = userData.user;
    if (!user) {
      logger.info('Get current profile succeeded', { profileFound: false, table: 'profiles' });
      return null;
    }

    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) {
      throw error;
    }

    logger.info('Get current profile succeeded', { userId: user.id, profileFound: Boolean(data), table: 'profiles' });
    return data ? mapProfile(data) : null;
  } catch (error) {
    logger.error('Get current profile failed', error, { table: 'profiles' });
    throw error;
  }
}

export async function ensureProfileExists(): Promise<Profile | null> {
  logger.debug('Ensure profile exists started', { table: 'profiles' });
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw userError;
    }
    const user = userData.user;
    if (!user) {
      return null;
    }

    const existing = await getCurrentProfile();
    if (existing) {
      logger.debug('Ensure profile exists succeeded', { userId: user.id, created: false, table: 'profiles' });
      return existing;
    }

    const metadata = user.user_metadata ?? {};
    const firstString = (...values: unknown[]): string | null => {
      for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
      return null;
    };

    // Supports display_name from sign-up metadata and full_name/name from external providers.
    const displayName =
      firstString(metadata.display_name, metadata.full_name, metadata.name) ?? emailPrefix(user.email);
    const phone = typeof metadata.phone === 'string' ? metadata.phone : null;
    const avatarUrl = firstString(metadata.avatar_url, metadata.picture);

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        display_name: displayName,
        email: user.email ?? null,
        phone,
        avatar_url: avatarUrl,
        default_currency: 'CAD',
        emt_email: user.email ?? null,
        emt_phone: phone,
        onboarding_completed: false,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    logger.info('Ensure profile exists succeeded', { userId: user.id, created: true, table: 'profiles' });
    return mapProfile(data);
  } catch (error) {
    logger.error('Ensure profile exists failed', error, { table: 'profiles' });
    throw error;
  }
}

export async function updateAvatar(userId: string, imageUri: string): Promise<string> {
  logger.info('Avatar upload started', { userId, table: 'storage.avatars' });
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const path = `${userId}/avatar-${Date.now()}.jpg`;

    const { error } = await supabase.storage.from('avatars').upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: true,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    logger.info('Avatar upload succeeded', { userId, table: 'storage.avatars' });
    return data.publicUrl || path;
  } catch (error) {
    logger.error('Avatar upload failed', error, { userId, table: 'storage.avatars' });
    throw error;
  }
}

export async function updateProfile(
  input: UpdateProfileInput,
  userId: string = getCachedUserId(),
): Promise<Profile> {
  logger.info('Update profile started', { userId, table: 'profiles' });
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw userError;
    }
    const authUserId = userId || userData.user?.id;
    if (!authUserId) {
      throw new Error('You must be logged in to update your profile.');
    }

    await ensureProfileExists();

    const { data, error } = await supabase
      .from('profiles')
      .update({
        display_name: input.displayName,
        phone: input.phone,
        avatar_url: input.avatarUrl,
        emt_email: input.emtEmail,
        emt_phone: input.emtPhone,
        preferred_emt_method: input.preferredEmtMethod,
        ...(input.defaultCurrency !== undefined ? { default_currency: input.defaultCurrency } : {}),
      })
      .eq('id', authUserId)
      .select('*')
      .single();
    if (error) {
      throw error;
    }

    logger.info('Update profile succeeded', { userId: authUserId, table: 'profiles' });
    return mapProfile(data);
  } catch (error) {
    logger.error('Update profile failed', error, { userId, table: 'profiles' });
    throw error;
  }
}
