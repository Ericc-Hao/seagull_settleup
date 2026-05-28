import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { GroupMemberWithProfile } from '../../types/views';
import { filterSplitSelectableMembers, isPendingParticipant } from '../../utils/groupParticipants';
import { colors, layout, radii, spacing, typography } from '../../theme';
import { Icon } from '../Icon';
import { PrimaryButton } from '../PrimaryButton';
import { UserAvatar, memberAvatarStatus, memberStatusLabel } from '../common/UserAvatar';

function HeaderAction({ label, icon, onPress }: { label: string; icon: 'check-circle' | 'x-mark'; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 }}
      hitSlop={8}
    >
      <Icon name={icon} size={18} color={colors.primary} />
      <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}

export function SplitParticipantsModal({
  visible,
  members,
  selectedMemberIds,
  onChange,
  onClose,
}: {
  visible: boolean;
  members: GroupMemberWithProfile[];
  selectedMemberIds: string[];
  onChange: (memberIds: string[]) => void;
  onClose: () => void;
}) {
  const [draftIds, setDraftIds] = useState<string[]>(selectedMemberIds);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (visible) {
      setDraftIds(selectedMemberIds);
      setError(undefined);
    }
  }, [visible, selectedMemberIds]);

  const selectableMembers = filterSplitSelectableMembers(members);
  const selectableMemberIds = selectableMembers.map((m) => m.id);

  const toggle = (memberId: string) => {
    setDraftIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
    setError(undefined);
  };

  const selectAll = () => {
    setDraftIds(selectableMemberIds);
    setError(undefined);
  };

  const clearAll = () => {
    setDraftIds([]);
  };

  const done = () => {
    if (draftIds.length === 0) {
      setError('Please choose at least one person to split with.');
      return;
    }
    onChange(draftIds);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(28, 35, 64, 0.4)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: radii['2xl'],
            borderTopRightRadius: radii['2xl'],
            paddingTop: spacing.md,
            paddingBottom: layout.cardGap,
            paddingHorizontal: layout.screenPadding,
            maxHeight: '85%',
            gap: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={typography.title}>Split Between</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Choose who should share this expense.
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="x-mark" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}>
            <HeaderAction label="Select All" icon="check-circle" onPress={selectAll} />
            <HeaderAction label="Clear All" icon="x-mark" onPress={clearAll} />
          </View>

          <ScrollView contentContainerStyle={{ gap: spacing.xs }}>
            {selectableMembers.map((member) => {
              const selected = draftIds.includes(member.id);
              const isPending = isPendingParticipant(member);
              return (
                <Pressable
                  key={member.id}
                  onPress={() => toggle(member.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    paddingVertical: 10,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radii.lg,
                    backgroundColor: selected ? colors.tertiary : colors.background,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: selected ? colors.primary : colors.borderSubtle,
                      backgroundColor: selected ? colors.primary : colors.white,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected ? <Icon name="check-circle" size={14} color={colors.white} /> : null}
                  </View>
                  <UserAvatar
                    avatarUrl={member.avatarUrl}
                    displayName={member.displayName}
                    email={member.email}
                    initials={member.avatarLabel}
                    size={36}
                    status={memberAvatarStatus(member.role, member.invitationStatus)}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={typography.bodyMedium}>{member.displayName}</Text>
                    {member.email ? (
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>{member.email}</Text>
                    ) : null}
                  </View>
                  <Text style={[typography.caption, { color: isPending ? '#F59E0B' : colors.textSecondary }]}>
                    {memberStatusLabel(member.role, member.invitationStatus)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {error ? (
            <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>{error}</Text>
          ) : null}

          <PrimaryButton label="Done" onPress={done} />
        </View>
      </View>
    </Modal>
  );
}
