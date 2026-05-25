import { Pressable, ScrollView, Text, View } from 'react-native';

import type { GroupMemberWithProfile } from '../../types/views';
import { colors, layout, radii, spacing, typography } from '../../theme';
import { UserAvatar, memberAvatarStatus } from '../common/UserAvatar';
import { Icon } from '../Icon';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';
import { BottomSheet } from '../common/BottomSheet';
import { TeamSettlementPreviewCard } from './TeamSettlementPreviewCard';
import type { PendingTransferView } from '../../types/views';

function SelectionActionChip({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 32,
        paddingHorizontal: 12,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={[typography.caption, { fontWeight: '600', color: colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

export function TeamSettlementModal({
  visible,
  step,
  members,
  selectedMemberIds,
  currentMemberId,
  validationError,
  previewTransfer,
  reviewing,
  onToggleMember,
  onSelectMyself,
  onSelectAll,
  onClear,
  onReview,
  onBackToSelection,
  onConfirmPreview,
  onClose,
}: {
  visible: boolean;
  step: 'select' | 'preview';
  members: GroupMemberWithProfile[];
  selectedMemberIds: string[];
  currentMemberId?: string;
  validationError?: string;
  previewTransfer?: PendingTransferView | null;
  reviewing?: boolean;
  onToggleMember: (memberId: string) => void;
  onSelectMyself: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onReview: () => void;
  onBackToSelection: () => void;
  onConfirmPreview: () => void;
  onClose: () => void;
}) {
  const selectedCount = selectedMemberIds.length;

  return (
    <BottomSheet
      visible={visible}
      title={step === 'select' ? 'Settle as a team' : 'Team settlement preview'}
      onClose={onClose}
      footer={
        step === 'preview' ? (
          <>
            {previewTransfer ? (
              <PrimaryButton label="Confirm Team Settlement" onPress={onConfirmPreview} />
            ) : null}
            <SecondaryButton
              label="Back to member selection"
              onPress={onBackToSelection}
              variant="outline"
            />
          </>
        ) : undefined
      }
    >
      {step === 'select' ? (
        <View style={{ gap: spacing.md }}>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
            Select members whose balances should be combined for this settlement.
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <SelectionActionChip label="Select Myself" onPress={onSelectMyself} />
            <SelectionActionChip label="Select All" onPress={onSelectAll} />
            <SelectionActionChip label="Clear" onPress={onClear} />
          </View>

          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {selectedCount} member{selectedCount === 1 ? '' : 's'} selected
          </Text>

          <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled>
            {members.map((member, index) => {
              const included = selectedMemberIds.includes(member.id);
              const isCurrentUser = member.id === currentMemberId;
              return (
                <Pressable
                  key={member.id}
                  onPress={() => {
                    if (isCurrentUser) {
                      return;
                    }
                    onToggleMember(member.id);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    paddingVertical: 12,
                    borderBottomWidth: index < members.length - 1 ? 1 : 0,
                    borderBottomColor: colors.borderSubtle,
                    opacity: isCurrentUser ? 1 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: included ? colors.primary : colors.white,
                      borderWidth: included ? 0 : 1.5,
                      borderColor: colors.borderSubtle,
                    }}
                  >
                    {included ? <Icon name="check-circle" size={14} color={colors.white} solid /> : null}
                  </View>
                  <UserAvatar
                    avatarUrl={member.avatarUrl}
                    displayName={member.displayName}
                    email={member.email}
                    initials={member.avatarLabel}
                    size="small"
                    status={memberAvatarStatus(member.role, member.invitationStatus)}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={typography.bodyMedium}>{member.displayName}</Text>
                    {member.email ? (
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>{member.email}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {validationError ? (
            <Text style={[typography.caption, { color: colors.danger }]}>{validationError}</Text>
          ) : null}

          <PrimaryButton
            label={reviewing ? 'Calculating…' : 'Review Team Settlement'}
            onPress={onReview}
            disabled={Boolean(validationError) || reviewing}
          />
        </View>
      ) : (
        <TeamSettlementPreviewCard transfer={previewTransfer} />
      )}
    </BottomSheet>
  );
}
