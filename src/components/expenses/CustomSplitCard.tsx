import { Pressable, Text, TextInput, View } from 'react-native';

import type { GroupMemberWithProfile } from '../../types/views';
import { colors, layout, radii, spacing, typography } from '../../theme';
import { formatCAD } from '../../utils/money';
import { UserAvatar, memberAvatarStatus } from '../common/UserAvatar';

export function CustomSplitCard({
  members,
  selectedMemberIds,
  customAmounts,
  totalAmountCents,
  onChangeAmount,
  onFillRemaining,
  onResetEqual,
}: {
  members: GroupMemberWithProfile[];
  selectedMemberIds: string[];
  customAmounts: Record<string, string>;
  totalAmountCents: number;
  onChangeAmount: (memberId: string, value: string) => void;
  onFillRemaining: () => void;
  onResetEqual: () => void;
}) {
  const selectedMembers = members.filter((m) => selectedMemberIds.includes(m.id));
  const assignedCents = selectedMembers.reduce((sum, member) => {
    const raw = customAmounts[member.id] ?? '';
    const normalized = raw.replace(/[^0-9.]/g, '');
    const dollars = Number.parseFloat(normalized);
    if (Number.isNaN(dollars)) {
      return sum;
    }
    return sum + Math.round(dollars * 100);
  }, 0);
  const matches = assignedCents === totalAmountCents && totalAmountCents > 0;

  return (
    <View
      style={{
        borderRadius: radii.lg,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: matches ? colors.borderSubtle : colors.danger,
        padding: layout.cardPadding,
        gap: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Assigned: {formatCAD(assignedCents)} / {formatCAD(totalAmountCents)}
        </Text>
        {!matches && totalAmountCents > 0 ? (
          <Text style={[typography.caption, { color: colors.danger }]}>Totals must match</Text>
        ) : null}
      </View>

      {selectedMembers.map((member) => (
        <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <UserAvatar
            avatarUrl={member.avatarUrl}
            displayName={member.displayName}
            email={member.email}
            initials={member.avatarLabel}
            size={36}
            status={memberAvatarStatus(member.role, member.invitationStatus)}
          />
          <Text style={[typography.bodyMedium, { flex: 1 }]} numberOfLines={1}>
            {member.displayName}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              borderRadius: radii.md,
              paddingHorizontal: 10,
              minWidth: 110,
              backgroundColor: colors.background,
            }}
          >
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>$</Text>
            <TextInput
              value={customAmounts[member.id] ?? ''}
              onChangeText={(value) => onChangeAmount(member.id, value)}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              style={[typography.bodyMedium, { flex: 1, paddingVertical: 8, paddingHorizontal: 6 }]}
            />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>CAD</Text>
          </View>
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Pressable onPress={onFillRemaining} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>Fill Remaining</Text>
        </Pressable>
        <Pressable onPress={onResetEqual} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>Reset Equal</Text>
        </Pressable>
      </View>
    </View>
  );
}
