import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton, ScreenLayout, ScreenPageHeader } from '../components';
import { ManageMembersList, MemberActionSheet } from '../components/groups';
import { useAppData } from '../context/AppDataContext';
import { useGroupMemberActions } from '../hooks/useGroupMemberActions';
import { useGroupParticipants } from '../hooks/useGroupParticipants';
import { getCurrentUserId, getGroupById } from '../services/groupService';
import { partitionMembers } from '../services/memberService';
import type { GroupMemberWithProfile } from '../types/views';
import { colors, layout, spacing, typography } from '../theme';
import { safeBack } from '../utils/navigation';

interface ManageMembersScreenProps {
  groupId: string;
}

export function ManageMembersScreen({ groupId }: ManageMembersScreenProps) {
  const { versions, getGroupDetailVersion } = useAppData();
  const groupDetailVersion = getGroupDetailVersion(groupId);
  const [selectedMember, setSelectedMember] = useState<GroupMemberWithProfile | null>(null);
  const { members, loading, refreshing, refresh } = useGroupParticipants(groupId, 'all');

  const group = useMemo(() => getGroupById(groupId), [groupId, versions.groups, groupDetailVersion]);
  const userId = getCurrentUserId();
  const isOwner = group?.ownerId === userId;
  const currentUserRole = isOwner ? 'owner' : 'member';

  const memberActions = useGroupMemberActions(groupId, refresh);

  const { active, pending, inactive } = useMemo(() => partitionMembers(members), [members]);

  return (
    <ScreenLayout
      header={
        <ScreenPageHeader
          title="Manage Members"
          subtitle={group?.name ?? 'Group members'}
          onBack={() => safeBack(`/group/${groupId}`)}
          showMascot={false}
        />
      }
      footer={
        isOwner ? (
          <View
            style={{
              paddingHorizontal: layout.screenPadding,
              paddingTop: layout.cardGap,
              paddingBottom: layout.cardGap,
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
            }}
          >
            <PrimaryButton
              label="Invite More Members"
              onPress={() => router.push(`/group/${groupId}/invite-members`)}
            />
          </View>
        ) : undefined
      }
    >
      {loading && members.length === 0 ? (
        <Text style={typography.caption}>Loading members...</Text>
      ) : (
        <>
          <ManageMembersList
            activeMembers={active}
            pendingMembers={pending}
            inactiveMembers={inactive}
            onPressMember={setSelectedMember}
          />
          {refreshing ? (
            <Text style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.sm }]}>
              Refreshing members…
            </Text>
          ) : null}
        </>
      )}

      <MemberActionSheet
        member={selectedMember}
        currentUserRole={currentUserRole}
        currentUserId={userId}
        visible={Boolean(selectedMember)}
        loading={memberActions.actionLoading}
        onClose={() => setSelectedMember(null)}
        onRemoveMember={
          isOwner
            ? (memberId) => {
                void memberActions.removeMember(memberId).then(() => setSelectedMember(null));
              }
            : undefined
        }
        onCancelInvitation={
          isOwner
            ? (member) => {
                void memberActions.cancelMemberInvitation(member).then(() => setSelectedMember(null));
              }
            : undefined
        }
        onResendInvitation={
          isOwner
            ? (invitationId) => {
                void memberActions
                  .resendMemberInvitation(invitationId)
                  .then((result) => {
                    if (result?.sent) {
                      setSelectedMember(null);
                    }
                  })
                  .catch(() => undefined);
              }
            : undefined
        }
      />
    </ScreenLayout>
  );
}
