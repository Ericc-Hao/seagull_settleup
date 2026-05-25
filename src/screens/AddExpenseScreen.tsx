import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import {
  CategoryGrid,
  FormSection,
  NoteField,
  PrimaryButton,
  ScreenLayout,
  ScreenPageHeader,
  SegmentedPill,
} from '../components';
import {
  AmountInputCard,
  CustomSplitCard,
  ReceiptPicker,
  SplitBetweenCard,
  SplitMethodSelector,
  SplitParticipantsModal,
  SplitPreviewCard,
} from '../components/expenses';
import { GroupSelectModal, GroupSelector, InviteMembersModal, PaidBySelector } from '../components/groups';
import { EXPENSE_TYPE_OPTIONS } from '../data/constants';
import { useAddExpenseForm } from '../hooks/useAddExpenseForm';
import { useGroups } from '../hooks/useGroups';
import { useInviteMembers } from '../hooks/useInviteMembers';
import { colors, layout, spacing, typography } from '../theme';
import { createLogger } from '../utils/logger';
import { safeBack } from '../utils/navigation';

const logger = createLogger('AddExpenseScreen');

const SECTION_GAP = 20;

interface AddExpenseScreenProps {
  initialGroupId?: string;
}

export function AddExpenseScreen({ initialGroupId }: AddExpenseScreenProps) {
  const groupsQuery = useGroups();
  const form = useAddExpenseForm(initialGroupId, groupsQuery);
  const inviteForm = useInviteMembers(form.selectedGroupId ?? '');
  const [inviteWarnings, setInviteWarnings] = useState<string[]>([]);

  useEffect(() => {
    logger.info('AddExpense groups state changed', {
      groupsCount: groupsQuery.groups.length,
      initialLoading: groupsQuery.initialLoading,
      loading: groupsQuery.loading,
      hasSelectedGroup: Boolean(form.selectedGroup),
    });
  }, [
    form.selectedGroup,
    groupsQuery.groups.length,
    groupsQuery.initialLoading,
    groupsQuery.loading,
  ]);

  const showSplitFields = form.kind === 'split' && Boolean(form.selectedGroupId);

  const handleSave = async () => {
    const ok = await form.save();
    if (ok) {
      safeBack('/(tabs)/expenses');
    }
  };

  const handleInviteSubmit = async () => {
    try {
      const result = await inviteForm.submit();
      setInviteWarnings(result?.warnings ?? []);
      await form.refreshMembers();
      form.setShowInviteModal(false);
      if (result?.warnings.length) {
        Alert.alert('Invitation sent with warnings', result.warnings.join('\n'));
      }
    } catch {
      // submitError shown in modal
    }
  };

  return (
    <>
      <ScreenLayout
        header={<ScreenPageHeader title={form.title} onBack={() => safeBack('/(tabs)/expenses')} />}
        footer={
          <View
            style={{
              paddingHorizontal: layout.screenPadding,
              paddingTop: layout.cardGap,
              paddingBottom: layout.cardGap,
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              gap: spacing.sm,
            }}
          >
            {form.submitError || form.validationError ? (
              <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>
                {form.submitError ?? form.validationError}
              </Text>
            ) : null}
            <PrimaryButton label={form.ctaLabel} onPress={() => void handleSave()} disabled={!form.canSave} />
          </View>
        }
      >
        <View style={{ gap: SECTION_GAP }}>
          <SegmentedPill options={EXPENSE_TYPE_OPTIONS} value={form.kind} onChange={form.setKind} />

          {form.kind === 'split' ? (
            <FormSection label="Group">
              <GroupSelector
                groups={form.groups}
                selectedGroup={form.selectedGroup}
                initialLoading={form.groupsInitialLoading}
                loading={form.groupsLoading}
                error={form.groupsError}
                onPress={() => form.setShowGroupModal(true)}
                onRetry={() => form.refetchGroups()}
                onCreateGroup={() => router.push('/create-group')}
              />
            </FormSection>
          ) : null}

          <AmountInputCard
            amountCents={form.amountCents}
            amountText={form.amountText}
            onChangeAmountText={form.onAmountChange}
          />

          {showSplitFields ? (
            <FormSection label="Paid by">
              {form.membersLoading ? (
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Loading members…</Text>
              ) : (
                <PaidBySelector
                  members={form.payerMembers}
                  selectedMemberId={form.payerMemberId}
                  onSelect={form.setPayerMemberId}
                  showInvite={form.isOwner}
                  onInvite={() => form.setShowInviteModal(true)}
                />
              )}
            </FormSection>
          ) : null}

          <FormSection label="Category">
            <CategoryGrid
              options={form.categoryOptions}
              selectedKey={form.categoryKey}
              onSelect={form.setCategoryKey}
            />
          </FormSection>

          {showSplitFields ? (
            <>
              <FormSection label="Split Between" noPadding>
                <SplitBetweenCard
                  members={form.members}
                  selectedMemberIds={form.splitMemberIds}
                  onPress={() => form.setShowSplitModal(true)}
                />
              </FormSection>

              <FormSection label="Split Method">
                <SplitMethodSelector value={form.splitMethod} onChange={form.setSplitMethod} />
              </FormSection>

              {form.splitMethod === 'custom' ? (
                <CustomSplitCard
                  members={form.members}
                  selectedMemberIds={form.splitMemberIds}
                  customAmounts={form.customAmounts}
                  totalAmountCents={form.amountCents}
                  onChangeAmount={form.setCustomAmount}
                  onFillRemaining={form.fillRemaining}
                  onResetEqual={form.resetEqualCustom}
                />
              ) : null}

              <FormSection label="Split Preview">
                <SplitPreviewCard
                  rows={form.previewRows}
                  totalAmountCents={form.amountCents}
                  warning={
                    form.splitMethod === 'custom' && !form.customSplitValid && form.amountCents > 0
                      ? 'Custom split total must equal the expense amount.'
                      : undefined
                  }
                />
              </FormSection>
            </>
          ) : null}

          <FormSection label="Receipt">
            <ReceiptPicker receiptUri={form.receiptUri} onChange={form.setReceiptUri} />
          </FormSection>

          <FormSection label="Note (optional)">
            <NoteField value={form.note} onChangeText={form.setNote} placeholder="Add a note..." />
          </FormSection>
        </View>
      </ScreenLayout>

      <GroupSelectModal
        visible={form.showGroupModal}
        groups={form.groups}
        selectedGroupId={form.selectedGroupId}
        onSelect={form.selectGroup}
        onClose={() => form.setShowGroupModal(false)}
        onCreateGroup={() => {
          form.setShowGroupModal(false);
          router.push('/create-group');
        }}
      />

      <SplitParticipantsModal
        visible={form.showSplitModal}
        members={form.members}
        selectedMemberIds={form.splitMemberIds}
        onChange={form.setSplitMemberIds}
        onClose={() => form.setShowSplitModal(false)}
      />

      {form.selectedGroupId ? (
        <InviteMembersModal
          visible={form.showInviteModal}
          invitedEmails={inviteForm.invitedEmails}
          emailValue={inviteForm.emailValue}
          emailError={inviteForm.emailError}
          submitError={inviteForm.submitError}
          warnings={[...inviteForm.warnings, ...inviteWarnings]}
          ctaLabel={inviteForm.ctaLabel}
          submitting={inviteForm.submitting}
          onEmailChange={inviteForm.setEmailValue}
          onAddEmail={() => void inviteForm.addEmail()}
          onRemoveEmail={inviteForm.removeEmail}
          onSubmit={() => void handleInviteSubmit()}
          onClose={() => {
            form.setShowInviteModal(false);
            setInviteWarnings([]);
          }}
        />
      ) : null}
    </>
  );
}
