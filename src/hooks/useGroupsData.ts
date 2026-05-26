import { useMemo } from 'react';

import { useAppData } from '../context/AppDataContext';
import { UI_COPY } from '../data/constants';
import { buildGroupCards, buildInactiveGroupCards, getGroupsSummary } from '../services/groupService';
import { formatCAD } from '../utils/money';

export function useGroupsData() {
  const { versions, pendingInvitations } = useAppData();

  return useMemo(() => {
    const summary = getGroupsSummary();
    return {
      title: UI_COPY.groupsTitle,
      subtitle: UI_COPY.groupsSubtitle,
      summary: {
        title: summary.monthLabel,
        primaryLabel: 'Active Groups',
        primaryValue: `${summary.activeGroupCount} groups`,
        stats: [
          { label: 'You are owed', value: formatCAD(summary.youOwedCents), tone: 'positive' as const },
          { label: 'You owe', value: formatCAD(summary.youOweCents), tone: 'negative' as const },
        ],
      },
      activeGroups: buildGroupCards(),
      inactiveGroups: buildInactiveGroupCards(),
      pendingInvitations,
    };
  }, [pendingInvitations, versions.groups, versions.settlements]);
}
