import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ADD_EXPENSE_MOCK, type ExpenseKind, type SplitMethod } from '../data/addExpenseMock';
import {
  AmountCard,
  AvatarSelectRow,
  CategoryGrid,
  FormSection,
  MemberCheckList,
  type MemberCheckItem,
  NoteField,
  PrimaryButton,
  ReceiptActions,
  ScreenLayout,
  ScreenPageHeader,
  SegmentedPill,
  SegmentedPillLight,
  SplitPreviewList,
} from '../components';
import { colors, layout } from '../theme';

const SECTION_GAP = 20;

interface AddExpenseScreenProps {
  groupId?: string;
}

export function AddExpenseScreen({ groupId: _groupId }: AddExpenseScreenProps) {
  const [kind, setKind] = useState<ExpenseKind>(ADD_EXPENSE_MOCK.defaultKind);
  const [payerId, setPayerId] = useState<string>(ADD_EXPENSE_MOCK.defaultPayerId);
  const [category, setCategory] = useState<string>(ADD_EXPENSE_MOCK.defaultCategory);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(ADD_EXPENSE_MOCK.defaultSplitMethod);
  const [note, setNote] = useState('');
  const [members, setMembers] = useState<MemberCheckItem[]>(
    ADD_EXPENSE_MOCK.splitMembers.map((m) => ({ ...m })),
  );

  const toggleMember = (id: string) => {
    setMembers((current) =>
      current.map((m) => (m.id === id ? { ...m, included: !m.included } : m)),
    );
  };

  const showSplit = kind === 'split';

  return (
    <ScreenLayout
      header={
        <ScreenPageHeader
          title={ADD_EXPENSE_MOCK.title}
          onBack={() => router.back()}
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
          }}
        >
          <PrimaryButton label={ADD_EXPENSE_MOCK.ctaLabel} onPress={() => router.back()} />
        </View>
      }
    >
      <View style={{ gap: SECTION_GAP }}>
        <SegmentedPill
          options={[
            { id: 'personal' as const, label: 'Personal' },
            { id: 'split' as const, label: 'Split' },
          ]}
          value={kind}
          onChange={setKind}
        />

        <AmountCard label={ADD_EXPENSE_MOCK.amountLabel} amount={ADD_EXPENSE_MOCK.amountDisplay} />

        <FormSection label="Paid by">
          <AvatarSelectRow
            options={ADD_EXPENSE_MOCK.payers.map((p) => ({ id: p.id, label: p.label }))}
            selectedId={payerId}
            onSelect={setPayerId}
          />
        </FormSection>

        <FormSection label="Category">
          <CategoryGrid
            options={[...ADD_EXPENSE_MOCK.categories]}
            selectedId={category}
            onSelect={setCategory}
          />
        </FormSection>

        {showSplit ? (
          <>
            <FormSection label="Split Between" noPadding>
              <MemberCheckList members={members} onToggle={toggleMember} />
            </FormSection>

            <FormSection label="Split Method">
              <SegmentedPillLight
                options={[
                  { id: 'equal' as const, label: 'Equal' },
                  { id: 'custom' as const, label: 'Custom' },
                ]}
                value={splitMethod}
                onChange={setSplitMethod}
              />
            </FormSection>
          </>
        ) : null}

        <FormSection label="Receipt">
          <ReceiptActions />
        </FormSection>

        <FormSection label="Note (optional)">
          <NoteField
            value={note}
            onChangeText={setNote}
            placeholder={ADD_EXPENSE_MOCK.notePlaceholder}
          />
        </FormSection>

        {showSplit ? (
          <FormSection label="Split Preview">
            <SplitPreviewList items={[...ADD_EXPENSE_MOCK.splitPreview]} />
          </FormSection>
        ) : null}
      </View>
    </ScreenLayout>
  );
}
