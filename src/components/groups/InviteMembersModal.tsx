import { Modal, Pressable, Text, View } from 'react-native';

import { colors, layout, radii, spacing, typography } from '../../theme';
import { Icon } from '../Icon';
import { PrimaryButton } from '../PrimaryButton';
import { InviteMembersCard } from './InviteMembersCard';

export function InviteMembersModal({
  visible,
  invitedEmails,
  emailValue,
  emailError,
  submitError,
  warnings,
  ctaLabel,
  submitting,
  onEmailChange,
  onAddEmail,
  onRemoveEmail,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  invitedEmails: string[];
  emailValue: string;
  emailError?: string;
  submitError?: string;
  warnings: string[];
  ctaLabel: string;
  submitting: boolean;
  onEmailChange: (value: string) => void;
  onAddEmail: () => void;
  onRemoveEmail: (email: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
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
            gap: spacing.md,
            maxHeight: '90%',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={typography.title}>Invite Members</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="x-mark" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <InviteMembersCard
            invitedEmails={invitedEmails}
            emailValue={emailValue}
            onEmailChange={onEmailChange}
            onAddEmail={onAddEmail}
            onRemoveEmail={onRemoveEmail}
            error={emailError}
          />

          {submitError ? (
            <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>{submitError}</Text>
          ) : null}
          {warnings.map((warning) => (
            <Text key={warning} style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
              {warning}
            </Text>
          ))}

          <PrimaryButton label={ctaLabel} onPress={onSubmit} disabled={submitting} />
        </View>
      </View>
    </Modal>
  );
}
