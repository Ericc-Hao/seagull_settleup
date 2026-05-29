import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { FormSection, PrimaryButton, ScreenLayout } from '../components';
import {
  DeleteGroupModal,
  GroupHeader,
  GroupMemberAvatarList,
  GroupRecentExpenses,
  GroupSettingsSheet,
  InviteMembersModal,
  MemberActionSheet,
  SetInactiveModal,
  ReactivateGroupModal,
} from '../components/groups';
import { useGroupDetail } from '../hooks/useGroupDetail';
import { useGroupMemberActions } from '../hooks/useGroupMemberActions';
import { useInviteMembers } from '../hooks/useInviteMembers';
import type { GroupMemberWithProfile } from '../types/views';
import { colors, layout, spacing, typography } from '../theme';
import { safeBack } from '../utils/navigation';

interface GroupDetailScreenProps {
  groupId: string;
}

export function GroupDetailScreen({ groupId }: GroupDetailScreenProps) {
  const detail = useGroupDetail(groupId);
  const memberActions = useGroupMemberActions(groupId, detail.refreshMembers);
  const inviteForm = useInviteMembers(groupId);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMemberWithProfile | null>(null);

  const actionError = detail.actionError ?? memberActions.actionError;

  const openSettings = () => {
    setShowSettings(true);
  };

  const openMemberSheet = (member: GroupMemberWithProfile) => {
    memberActions.clearActionError();
    setSelectedMember(member);
  };

  const closeMemberSheet = () => {
    setSelectedMember(null);
  };

  if (detail.loadingGroup) {
    return (
      <ScreenLayout
        header={
          <GroupHeader
            group={{ id: groupId, name: 'Loading…', type: 'Other', currency: 'CAD', startDate: '', settlementMode: 'individual', status: 'active', ownerId: '', createdAt: '', updatedAt: '' }}
            subtitle="Loading group…"
            onBack={() => safeBack('/(tabs)/groups')}
            showSettings={false}
          />
        }
      >
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Loading group details…</Text>
      </ScreenLayout>
    );
  }

  if (!detail.group) {
    return (
      <ScreenLayout
        header={
          <GroupHeader
            group={{ id: groupId, name: 'Group', type: 'Other', currency: 'CAD', startDate: '', settlementMode: 'individual', status: 'active', ownerId: '', createdAt: '', updatedAt: '' }}
            subtitle="Group not found."
            onBack={() => safeBack('/(tabs)/groups')}
            showSettings={false}
          />
        }
      >
        <View style={{ gap: layout.cardGap }}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {detail.loadError ?? 'This group could not be loaded.'}
          </Text>
          <PrimaryButton label="Back to Groups" onPress={() => router.replace('/(tabs)/groups')} />
        </View>
      </ScreenLayout>
    );
  }

  const group = detail.group;

  return (
    <ScreenLayout
      header={
        <GroupHeader
          group={group}
          subtitle={`${group.type} · ${group.currency} · ${detail.dateLabel}`}
          onBack={() => safeBack('/(tabs)/groups')}
          onOpenSettings={openSettings}
        />
      }
    >
      <View style={{ gap: spacing.lg }}>
        <FormSection label="Members">
          {detail.loadingMembers && detail.members.length === 0 ? (
            <Text style={typography.caption}>Loading members...</Text>
          ) : (
            <>
              <GroupMemberAvatarList
                members={detail.members}
                onPressMember={openMemberSheet}
                onPressInvite={
                  detail.isOwner && !detail.isInactive
                    ? () => {
                        setShowSettings(false);
                        setShowInviteModal(true);
                      }
                    : undefined
                }
                showInviteButton={detail.isOwner && !detail.isInactive}
              />
              {detail.membersRefreshing ? (
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.xs }]}>
                  Refreshing members…
                </Text>
              ) : null}
            </>
          )}
        </FormSection>

        <View
          style={{
            backgroundColor: colors.white,
            borderRadius: layout.cardRadius,
            padding: layout.cardPadding,
            gap: spacing.sm,
          }}
        >
          <Text style={typography.sectionTitle}>Shared Expenses</Text>
          <Text style={[typography.title, { fontSize: 28 }]}>{detail.totalSpentLabel}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Total spent in this group</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            {!detail.isInactive ? (
              <>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label="Add Expense"
                    onPress={() => router.push(`/add-expense?groupId=${groupId}`)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label="Settle Up"
                    onPress={() => router.push(`/group/${groupId}/settle-up`)}
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>

        <GroupRecentExpenses
          expenses={detail.recentExpenses}
          groupId={groupId}
          onAddExpense={
            detail.isInactive ? undefined : () => router.push(`/add-expense?groupId=${groupId}`)
          }
        />

        {detail.isInactive ? (
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
            This group is inactive. Reactivate it to make changes.
          </Text>
        ) : null}

        {actionError ? (
          <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>{actionError}</Text>
        ) : null}
      </View>

      <GroupSettingsSheet
        visible={showSettings}
        isOwner={detail.isOwner}
        isInactive={detail.isInactive}
        onClose={() => setShowSettings(false)}
        onManageMembers={() => {
          setShowSettings(false);
          router.push(`/group/${groupId}/manage-members`);
        }}
        onInviteMembers={() => {
          setShowSettings(false);
          setShowInviteModal(true);
        }}
        onEditGroup={() => {
          setShowSettings(false);
          router.push(`/group/${groupId}/edit-group`);
        }}
        onSetInactive={() => {
          setShowSettings(false);
          setShowInactiveModal(true);
        }}
        onReactivate={() => {
          setShowSettings(false);
          setShowReactivateModal(true);
        }}
        onDeleteGroup={() => {
          setShowSettings(false);
          setShowDeleteModal(true);
        }}
      />

      <MemberActionSheet
        member={selectedMember}
        currentUserRole={detail.currentUserRole}
        currentUserId={detail.currentUserId}
        visible={Boolean(selectedMember)}
        loading={memberActions.actionLoading}
        onClose={closeMemberSheet}
        onRemoveMember={(memberId) => {
          void memberActions
            .removeMember(memberId)
            .then(closeMemberSheet)
            .catch(() => undefined);
        }}
        onCancelInvitation={(member) => {
          void memberActions
            .cancelMemberInvitation(member)
            .then(closeMemberSheet)
            .catch(() => undefined);
        }}
        onResendInvitation={(invitationId) => {
          void memberActions
            .resendMemberInvitation(invitationId)
            .then((result) => {
              if (result?.sent) {
                closeMemberSheet();
              }
            })
            .catch(() => undefined);
        }}
      />

      <InviteMembersModal
        visible={showInviteModal}
        invitedEmails={inviteForm.invitedEmails}
        emailValue={inviteForm.emailValue}
        emailError={inviteForm.emailError}
        submitError={inviteForm.submitError}
        warnings={inviteForm.warnings}
        ctaLabel={inviteForm.ctaLabel}
        submitting={inviteForm.submitting}
        onEmailChange={inviteForm.setEmailValue}
        onAddEmail={() => {
          void inviteForm.addEmail();
        }}
        onRemoveEmail={inviteForm.removeEmail}
        onSubmit={() => {
          void inviteForm
            .submit()
            .then(async () => {
              await detail.refreshMembers();
              setShowInviteModal(false);
            })
            .catch(() => undefined);
        }}
        onClose={() => setShowInviteModal(false)}
      />

      <DeleteGroupModal
        visible={showDeleteModal}
        loading={detail.actionLoading}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => {
          void detail
            .removeGroup()
            .then(() => {
              setShowDeleteModal(false);
              Alert.alert('Group deleted', 'This group and all related data have been removed.');
              router.replace('/(tabs)/groups');
            })
            .catch(() => {
              setShowDeleteModal(false);
            });
        }}
      />

      <SetInactiveModal
        visible={showInactiveModal}
        loading={detail.actionLoading}
        onCancel={() => setShowInactiveModal(false)}
        onConfirm={() => {
          void detail
            .setInactive()
            .then(() => {
              setShowInactiveModal(false);
              router.replace('/(tabs)/groups');
            })
            .catch(() => {
              setShowInactiveModal(false);
            });
        }}
      />

      <ReactivateGroupModal
        visible={showReactivateModal}
        loading={detail.actionLoading}
        onCancel={() => setShowReactivateModal(false)}
        onConfirm={() => {
          void detail
            .reactivate()
            .then(() => {
              setShowReactivateModal(false);
            })
            .catch(() => {
              setShowReactivateModal(false);
            });
        }}
      />
    </ScreenLayout>
  );
}
