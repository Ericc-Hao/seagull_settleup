import { useEffect, useMemo, useState } from 'react';

import { useAppData } from '../context/AppDataContext';
import { UI_COPY } from '../data/constants';
import { buildGroupCards, buildInactiveGroupCards, getGroupsSummary } from '../services/groupService';
import { getPendingInvitationsForCurrentUser } from '../services/invitationService';
import type { PendingInvitationView } from '../types/views';
import { formatCAD } from '../utils/money';
import { createLogger } from '../utils/logger';

const logger = createLogger('useGroupsData');

export function useGroupsData() {
  const { version } = useAppData();
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitationView[]>([]);

  useEffect(() => {
    logger.info('Fetch pending invitations started');
    void getPendingInvitationsForCurrentUser()
      .then((invitations) => {
        setPendingInvitations(invitations);
        logger.info('Fetch pending invitations succeeded', { count: invitations.length });
      })
      .catch((error) => {
        logger.error('Fetch pending invitations failed', error);
        setPendingInvitations([]);
      });
  }, [version]);

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
  }, [pendingInvitations, version]);
}
