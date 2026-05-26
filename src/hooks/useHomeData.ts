import { useMemo } from 'react';

import { useAppData } from '../context/AppDataContext';
import {
  getHomeBookkeeping,
  getHomeOverview,
  getHomeSplitGroups,
  getQuickActions,
} from '../services/homeService';
import { getProfile } from '../services/profileService';
import { formatCAD } from '../utils/money';

export function useHomeData() {
  const { versions, ready } = useAppData();

  return useMemo(() => {
    const overview = getHomeOverview();
    const profile = getProfile();
    return {
      loading: !ready,
      profile: {
        displayName: profile?.displayName,
        email: profile?.email,
        avatarUrl: profile?.avatarUrl,
      },
      subtitle: "Here's your spending overview.",
      overview: {
        title: 'Monthly Overview',
        totalSpent: formatCAD(overview.totalSpentCents),
        youOwed: formatCAD(overview.youOwedCents),
        youOwe: formatCAD(overview.youOweCents),
      },
      quickActions: getQuickActions(),
      bookkeeping: getHomeBookkeeping().map((row) => ({
        id: row.id,
        label: row.label,
        amount: formatCAD(row.amountCents),
        icon: row.icon,
        tint: row.tint,
        bg: row.bg,
        categoryKey: row.categoryKey,
        categoryName: row.categoryName,
      })),
      splitGroups: getHomeSplitGroups(),
    };
  }, [ready, versions.home, versions.profile, versions.groups, versions.expenses, versions.settlements]);
}
