import { Text, View } from 'react-native';

import type { GroupMemberWithProfile } from '../../types/views';
import { colors, layout, radii, spacing, typography } from '../../theme';
import { formatCAD } from '../../utils/money';
import { isPendingParticipant } from '../../utils/groupParticipants';
import { UserAvatar, memberAvatarStatus } from '../common/UserAvatar';

export interface SplitPreviewRow {
  member: GroupMemberWithProfile;
  amountCents: number;
}

export function SplitPreviewCard({
  rows,
  totalAmountCents,
  warning,
}: {
  rows: SplitPreviewRow[];
  totalAmountCents: number;
  warning?: string;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        borderRadius: radii.lg,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: warning ? colors.danger : colors.borderSubtle,
        padding: layout.cardPadding,
        gap: spacing.sm,
      }}
    >
      {rows.map(({ member, amountCents }) => {
        const pending = isPendingParticipant(member);
        return (
        <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <UserAvatar
            avatarUrl={member.avatarUrl}
            displayName={member.displayName}
            email={member.email}
            initials={member.avatarLabel}
            size={32}
            status={memberAvatarStatus(member.role, member.invitationStatus)}
          />
          <Text style={[typography.body, { flex: 1, color: colors.textPrimary }]} numberOfLines={1}>
            {member.displayName}
            {pending ? (
              <Text style={[typography.caption, { color: '#F59E0B' }]}> · Pending</Text>
            ) : null}
          </Text>
          <View
            style={{
              flex: 1,
              height: 1,
              borderBottomWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.borderSubtle,
              marginHorizontal: 4,
            }}
          />
          <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>{formatCAD(amountCents)}</Text>
        </View>
        );
      })}
      <View
        style={{
          marginTop: spacing.xs,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Expense total</Text>
        <Text style={typography.bodyMedium}>{formatCAD(totalAmountCents)}</Text>
      </View>
      {warning ? (
        <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>{warning}</Text>
      ) : null}
    </View>
  );
}
