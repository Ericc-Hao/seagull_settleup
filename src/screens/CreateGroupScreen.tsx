import { router } from 'expo-router';
import { Text, View } from 'react-native';

import {
  FormSection,
  PrimaryButton,
  ScreenLayout,
  ScreenPageHeader,
} from '../components';
import { DateField } from '../components/form/DateField';
import { FormInput } from '../components/form/FormInput';
import {
  GroupTypeSelector,
  InviteMembersCard,
  LockedCurrencyField,
} from '../components/groups';
import { useCreateGroup } from '../hooks/useCreateGroup';
import { colors, layout, typography } from '../theme';
import { safeBack } from '../utils/navigation';

const SECTION_GAP = 24;

export function CreateGroupScreen() {
  const form = useCreateGroup();

  const handleSubmit = () => {
    void form
      .submit()
      .then((result) => {
        router.replace(`/group/${result.group.id}`);
      })
      .catch(() => {
        // Validation and submit errors are surfaced in form state.
      });
  };

  return (
    <ScreenLayout
      header={
        <ScreenPageHeader
          title={form.title}
          subtitle={form.subtitle}
          onBack={() => safeBack('/(tabs)/groups')}
          showMascot
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
            gap: spacingSm,
          }}
        >
          {form.submitError ? (
            <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>
              {form.submitError}
            </Text>
          ) : null}
          <PrimaryButton
            label={form.ctaLabel}
            onPress={handleSubmit}
            disabled={form.submitting}
          />
        </View>
      }
    >
      <View style={{ gap: SECTION_GAP }}>
        <FormSection label="Group Name">
          <FormInput
            value={form.name}
            onChangeText={form.setName}
            placeholder="Trip to Banff"
            error={form.nameError}
          />
        </FormSection>

        <FormSection label="Group Type">
          <GroupTypeSelector value={form.groupType} onChange={form.setGroupType} />
        </FormSection>

        <FormSection label="Currency" hint="Currency is locked for all members.">
          <LockedCurrencyField />
        </FormSection>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <DateField
            label="Start Date"
            value={form.startDate}
            onChange={form.setStartDate}
          />
          <DateField
            label="End Date (Optional)"
            value={form.endDate}
            onChange={form.setEndDate}
            minimumDate={form.endDateMinimum}
            error={form.dateError}
            placeholder="No end date"
            optional
            clearable
          />
        </View>

        <FormSection label="Invite Members">
          <InviteMembersCard
            invitedEmails={form.invitedEmails}
            emailValue={form.emailValue}
            onEmailChange={(email) => {
              form.setEmailValue(email);
            }}
            onAddEmail={() => {
              void form.addEmail();
            }}
            onRemoveEmail={form.removeEmail}
            error={form.emailError}
          />
        </FormSection>
      </View>
    </ScreenLayout>
  );
}

const spacingSm = 8;
