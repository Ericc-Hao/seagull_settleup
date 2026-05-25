import { Pressable, Text, View } from 'react-native';

import type { GroupMemberWithProfile } from '../../types/views';
import { colors, layout, radii, spacing, typography } from '../../theme';
import { UserAvatar, memberAvatarStatus } from '../common/UserAvatar';
import { Icon } from '../Icon';

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
        height: 34,
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

export function TeamSelectionCard({
  members,
  selectedMemberIds,
  onToggle,
  onSelectMyself,
  onSelectAll,
  onClear,
  validationError,
}: {
  members: GroupMemberWithProfile[];
  selectedMemberIds: string[];
  onToggle: (memberId: string) => void;
  onSelectMyself: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  validationError?: string;
}) {
  const selectedCount = selectedMemberIds.length;

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: layout.cardRadius,
        padding: layout.cardPadding,
        gap: spacing.sm,
      }}
    >
      <Text style={typography.sectionTitle}>Settle Together</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        Select members whose balances should be combined.
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <SelectionActionChip label="Select Myself" onPress={onSelectMyself} />
        <SelectionActionChip label="Select All" onPress={onSelectAll} />
        <SelectionActionChip label="Clear" onPress={onClear} />
      </View>

      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        {selectedCount} member{selectedCount === 1 ? '' : 's'} selected
      </Text>

      <View>
        {members.map((member, index) => {
          const included = selectedMemberIds.includes(member.id);
          return (
            <Pressable
              key={member.id}
              onPress={() => onToggle(member.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: 12,
                borderBottomWidth: index < members.length - 1 ? 1 : 0,
                borderBottomColor: colors.borderSubtle,
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
      </View>

      {validationError ? (
        <Text style={[typography.caption, { color: colors.danger }]}>{validationError}</Text>
      ) : null}
    </View>
  );
}
