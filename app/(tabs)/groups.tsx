import { router } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import {
  ScreenLayout,
  EmptyStateCard,
  SplitGroupCard,
  SummaryOverviewCard,
  TabPageHeader,
  SectionTitle,
} from '../../src/components';
import { PendingInvitationCard } from '../../src/components/invitations/PendingInvitationCard';
import { useAppData } from '../../src/context/AppDataContext';
import { useNotifications } from '../../src/context/NotificationsContext';
import { useGroupsData } from '../../src/hooks/useGroupsData';
import { useInvitationActions } from '../../src/hooks/useInvitationActions';
import { layout } from '../../src/theme';

export default function GroupsTabScreen() {
  const data = useGroupsData();
  const { unreadCount } = useNotifications();
  const { refresh: refreshAppData } = useAppData();

  const onActionComplete = useCallback(async () => {
    await refreshAppData();
  }, [refreshAppData]);

  const { accept, decline, processingId } = useInvitationActions(onActionComplete);

  return (
    <ScreenLayout
      header={
        <TabPageHeader
          title={data.title}
          subtitle={data.subtitle}
          unreadCount={unreadCount}
          onNotificationPress={() => router.push('/notifications')}
        />
      }
    >
      <SummaryOverviewCard
        title={data.summary.title}
        primaryLabel={data.summary.primaryLabel}
        primaryValue={data.summary.primaryValue}
        stats={data.summary.stats}
        showMascot={false}
      />

      {data.pendingInvitations.length > 0 ? (
        <View style={{ gap: layout.cardGap }}>
          <SectionTitle title="Pending Invitations" />
          {data.pendingInvitations.map((invitation) => (
            <PendingInvitationCard
              key={invitation.id}
              invitation={invitation}
              processing={processingId === invitation.id}
              onAccept={() =>
                void accept(invitation.id).then((result) => {
                  if (result?.groupId) {
                    router.push(`/group/${result.groupId}`);
                  }
                })
              }
              onDecline={() => void decline(invitation.id)}
            />
          ))}
        </View>
      ) : null}

      <View style={{ gap: layout.cardGap }}>
        <SectionTitle title="Active Groups" />
        {data.activeGroups.length > 0 ? (
          data.activeGroups.map((group) => (
            <SplitGroupCard
              key={group.id}
              group={group}
              layout="full"
              onPress={() => router.push(`/group/${group.id}`)}
            />
          ))
        ) : (
          <EmptyStateCard
            title="No active groups yet"
            message="Create a group for a trip, dinner, or shared budget."
            ctaLabel="Create Group"
            ctaIcon="user-group"
            onPress={() => router.push('/create-group')}
          />
        )}
      </View>

      {data.inactiveGroups.length > 0 ? (
        <View style={{ gap: layout.cardGap }}>
          <SectionTitle title="Inactive Groups" />
          {data.inactiveGroups.map((group) => (
            <SplitGroupCard
              key={group.id}
              group={group}
              layout="full"
              onPress={() => router.push(`/group/${group.id}`)}
            />
          ))}
        </View>
      ) : null}
    </ScreenLayout>
  );
}
