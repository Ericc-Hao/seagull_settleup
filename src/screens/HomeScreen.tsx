import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  HomeSplitGroupCard,
  EmptyStateCard,
  HomeHeader,
  PrimaryButtonRow,
  QuickActionsGrid,
  ScreenLayout,
  SectionCard,
  SectionRow,
  SectionTitle,
  SummaryOverviewCard,
} from '../components';
import { useHomeData } from '../hooks/useHomeData';
import { useNotifications } from '../context/NotificationsContext';
import { getPrimaryGroupIdForUser } from '../services/groupService';
import {
  formatInvitationMessage,
  syncPendingInvitationsForCurrentUser,
} from '../services/invitationService';
import type { PendingInvitationView } from '../types/views';
import { colors, layout, typography } from '../theme';

export function HomeScreen() {
  const data = useHomeData();
  const { unreadCount } = useNotifications();
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitationView[]>([]);
  const primaryGroupId = getPrimaryGroupIdForUser();

  useFocusEffect(
    useCallback(() => {
      void syncPendingInvitationsForCurrentUser()
        .then(setPendingInvitations)
        .catch(() => setPendingInvitations([]));
    }, []),
  );

  const onQuickAction = (id: string) => {
    if (id === 'create') router.push('/create-group');
    if (id === 'settle' && primaryGroupId) router.push(`/group/${primaryGroupId}/settle-up`);
    if (id === 'personal') {
      router.push('/add-expense');
    }
  };

  return (
    <ScreenLayout
      header={
        <HomeHeader
          displayName={data.profile.displayName}
          email={data.profile.email}
          avatarUrl={data.profile.avatarUrl}
          loading={data.loading}
          unreadCount={unreadCount}
          onNotificationPress={() => router.push('/notifications')}
        />
      }
    >
      <SummaryOverviewCard
        title={data.overview.title}
        primaryLabel="Total Spent"
        primaryValue={data.overview.totalSpent}
        stats={[
          { label: 'You are owed', value: data.overview.youOwed, tone: 'positive' },
          { label: 'You owe', value: data.overview.youOwe, tone: 'negative' },
        ]}
      />

      {pendingInvitations.length > 0 ? (
        <Pressable
          onPress={() => router.push('/notifications')}
          style={{
            backgroundColor: colors.white,
            borderRadius: layout.cardRadius,
            padding: layout.cardPadding,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            gap: 6,
          }}
        >
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Pending invitations</Text>
          <Text style={typography.bodyMedium}>
            {formatInvitationMessage({
              inviterName: pendingInvitations[0].inviterName,
              inviterEmail: pendingInvitations[0].inviterEmail,
              groupName: pendingInvitations[0].groupName,
            })}
          </Text>
          {pendingInvitations.length > 1 ? (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              +{pendingInvitations.length - 1} more
            </Text>
          ) : null}
        </Pressable>
      ) : null}

      <PrimaryButtonRow
        left={{
          label: 'Add Expense',
          icon: 'document-plus',
          onPress: () => {
            router.push('/add-expense');
          },
        }}
        right={{
          label: 'Create Group',
          icon: 'users',
          onPress: () => router.push('/create-group'),
        }}
      />

      <View style={{ gap: layout.cardGap }}>
        <SectionTitle title="Actions" />
        <QuickActionsGrid actions={[...data.quickActions]} onAction={onQuickAction} />
      </View>

      <View style={{ gap: layout.cardGap }}>
        <SectionTitle title="Personal Spending" />
        {data.bookkeeping.length > 0 ? (
          <SectionCard>
            {data.bookkeeping.map((row, index) => (
              <SectionRow
                key={row.id}
                categoryKey={row.categoryKey}
                categoryName={row.categoryName}
                label={row.label}
                value={row.amount}
                showDivider={index < data.bookkeeping.length - 1}
                showChevron={false}
              />
            ))}
          </SectionCard>
        ) : (
          <EmptyStateCard
            title="No expenses yet"
            message="Add your first expense to start tracking this month."
            ctaLabel={primaryGroupId ? 'Add Expense' : 'Create Group'}
            ctaIcon="document-plus"
            onPress={() => {
              router.push('/add-expense');
            }}
          />
        )}
      </View>

      <View style={{ gap: layout.cardGap }}>
        <SectionTitle title="Split Groups" actionLabel="View All" onAction={() => router.push('/(tabs)/groups')} />
        {data.splitGroups.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: layout.cardGap }}>
            {data.splitGroups.map((group) => (
              <HomeSplitGroupCard
                key={group.id}
                name={group.name}
                balance={group.balance}
                positive={group.positive}
                onPress={() => router.push(`/group/${group.id}`)}
              />
            ))}
          </View>
        ) : (
          <EmptyStateCard
            title="No split groups yet"
            message="Create a group when you have shared expenses to track."
            ctaLabel="Create Group"
            ctaIcon="user-group"
            onPress={() => router.push('/create-group')}
          />
        )}
      </View>
    </ScreenLayout>
  );
}
