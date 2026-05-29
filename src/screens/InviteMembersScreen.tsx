import { router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { FormSection, PrimaryButton, ScreenLayout, ScreenPageHeader } from '../components';
import { InactiveGroupMutationBlock, InviteMembersCard } from '../components/groups';
import { useAppData } from '../context/AppDataContext';
import { useInviteMembers } from '../hooks/useInviteMembers';
import { canMutateGroup, getGroupById } from '../services/groupService';
import { colors, layout, typography } from '../theme';
import { safeBack } from '../utils/navigation';

interface InviteMembersScreenProps {
  groupId: string;
}

export function InviteMembersScreen({ groupId }: InviteMembersScreenProps) {
  const { versions, getGroupDetailVersion } = useAppData();
  const groupDetailVersion = getGroupDetailVersion(groupId);
  const group = useMemo(
    () => getGroupById(groupId),
    [groupId, versions.groups, groupDetailVersion],
  );
  const form = useInviteMembers(groupId);

  if (group && !canMutateGroup(group)) {
    return <InactiveGroupMutationBlock groupId={groupId} title="Invite Members" />;
  }

  const handleSubmit = () => {
    void form
      .submit()
      .then(() => {
        router.back();
      })
      .catch(() => {
        // Errors shown in form state.
      });
  };

  return (
    <ScreenLayout
      header={
        <ScreenPageHeader
          title="Invite Members"
          subtitle="Invite members by email. They can accept after registering or logging in."
          onBack={() => safeBack(`/group/${groupId}`)}
        />
      }
      footer={
        <View
          style={{
            paddingHorizontal: layout.screenPadding,
            paddingTop: layout.cardGap,
            paddingBottom: layout.cardGap,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.borderSubtle,
            gap: 8,
          }}
        >
          {form.submitError ? (
            <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>
              {form.submitError}
            </Text>
          ) : null}
          {form.warnings.map((warning) => (
            <Text key={warning} style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
              {warning}
            </Text>
          ))}
          <PrimaryButton label={form.ctaLabel} onPress={handleSubmit} disabled={form.submitting} />
        </View>
      }
    >
      <FormSection label="Invite Members">
        <InviteMembersCard
          invitedEmails={form.invitedEmails}
          emailValue={form.emailValue}
          onEmailChange={form.setEmailValue}
          onAddEmail={() => {
            void form.addEmail();
          }}
          onRemoveEmail={form.removeEmail}
          error={form.emailError}
        />
      </FormSection>
    </ScreenLayout>
  );
}
