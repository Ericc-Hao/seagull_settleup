import { useMemo } from 'react';

import { useAppData } from '../context/AppDataContext';
import { UI_COPY } from '../data/constants';
import { getProfile } from '../services/profileService';

export function useProfileData() {
  const { version } = useAppData();

  return useMemo(() => {
    const profile = getProfile();
    return {
      title: UI_COPY.profileTitle,
      subtitle: 'Manage your account and payment info',
      profile,
      user: {
        id: profile?.userId ?? 'profile',
        name: profile?.displayName ?? profile?.email?.split('@')[0] ?? '',
        email: profile?.email,
        avatarUrl: profile?.avatarUrl,
      },
    };
  }, [version]);
}
