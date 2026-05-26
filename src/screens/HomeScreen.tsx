import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import {
  HomeSplitGroupCard,
  EmptyStateCard,
  HomeHeader,
  PrimaryButton,
  QuickActionsGrid,
  ScreenLayout,
  SecondaryButton,
  SectionCard,
  SectionRow,
  SectionTitle,
  SummaryOverviewCard,
} from '../components';
import { useAppData } from '../context/AppDataContext';
import { useHomeData } from '../hooks/useHomeData';
import { useNotifications } from '../context/NotificationsContext';
import { getPrimaryGroupIdForUser } from '../services/groupService';
import { formatInvitationMessage } from '../services/invitationService';
import { colors, layout, typography } from '../theme';
import { useStaleFocusRefresh } from '../hooks/useStaleFocusRefresh';

export function HomeScreen() {
  const data = useHomeData();
  const { pendingInvitations } = useAppData();
  const { unreadCount } = useNotifications();
  const primaryGroupId = getPrimaryGroupIdForUser();

  useStaleFocusRefresh({
    types: ['home', 'invitations', 'notifications'],
  });

  const onQuickAction = (id: string) => {
    if (id === 'create') router.push('/create-group');
    if (id === 'settle') router.push('/pending-transfers');
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

      {/* Home uses components/home/QuickActionsGrid.tsx (not QuickActionCard). */}
      <View style={{ flexDirection: 'row', width: '100%' }}>
        <View style={{ width: '50%', paddingRight: 6, minWidth: 0 }}>
          <PrimaryButton
            label="Add Expense"
            icon="document-plus"
            onPress={() => router.push('/add-expense')}
          />
        </View>
        <View style={{ width: '50%', paddingLeft: 6, minWidth: 0 }}>
          <SecondaryButton
            label="Create Group"
            icon="users"
            onPress={() => router.push('/create-group')}
            variant="filled"
          />
        </View>
      </View>

      <View>
        <SectionTitle title="Actions" />
        <View style={{ marginTop: layout.cardGap }}>
          <QuickActionsGrid actions={[...data.quickActions]} onAction={onQuickAction} />
        </View>
      </View>

      <View>
        <SectionTitle title="Personal Spending" />
        <View style={{ marginTop: layout.cardGap }}>
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
      </View>

      <View>
        <SectionTitle title="Split Groups" actionLabel="View All" onAction={() => router.push('/(tabs)/groups')} />
        <View style={{ marginTop: layout.cardGap }}>
          {data.splitGroups.length > 0 ? (
            <View style={{ flexDirection: 'row', width: '100%' }}>
              {data.splitGroups.map((group, index) => (
                <View
                  key={group.id}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    marginRight: index < data.splitGroups.length - 1 ? layout.cardGap : 0,
                  }}
                >
                  <HomeSplitGroupCard
                    name={group.name}
                    balance={group.balance}
                    positive={group.positive}
                    onPress={() => router.push(`/group/${group.id}`)}
                  />
                </View>
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
      </View>
    </ScreenLayout>
  );
}
