import { Pressable, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { Icon } from '../Icon';
import { EmailInput } from '../form/EmailInput';
import { InvitedMemberRow } from './InvitedMemberRow';

export function InviteMembersCard({
  invitedEmails,
  emailValue,
  onEmailChange,
  onAddEmail,
  onRemoveEmail,
  error,
}: {
  invitedEmails: string[];
  emailValue: string;
  onEmailChange: (email: string) => void;
  onAddEmail: () => void;
  onRemoveEmail: (email: string) => void;
  error?: string;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={[typography.caption, { paddingHorizontal: 2, lineHeight: 18 }]}>
        Invite members by email. They can accept the invitation after registering or logging in.
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <EmailInput
            value={emailValue}
            onChangeText={onEmailChange}
            placeholder="Email address"
            error={error}
            onSubmitEditing={onAddEmail}
          />
        </View>
        <Pressable
          onPress={onAddEmail}
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            marginTop: 0,
          }}
        >
          <Icon name="plus" size={20} color={colors.white} strokeWidth={2} />
        </Pressable>
      </View>

      {invitedEmails.length > 0 ? (
        <View>
          {invitedEmails.map((email) => (
            <InvitedMemberRow
              key={email}
              email={email}
              status="Pending"
              onRemove={() => onRemoveEmail(email)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
