import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppData } from '../context/AppDataContext';
import { UI_COPY } from '../data/constants';
import type { CategoryOption } from '../components/form/CategoryGrid';
import type { CategoryKey } from '../constants/categories';
import type { SplitPreviewRow } from '../components/expenses/SplitPreviewCard';
import { getCachedCategories } from '../services/categoryService';
import { createPersonalExpense, createSplitExpense } from '../services/expenseService';
import { getCurrentUserId, getGroupById } from '../services/groupService';
import { getGroupMembersWithProfiles } from '../services/memberService';
import type { ExpenseType, SplitMethod } from '../types/models';
import type { GroupMemberWithProfile, GroupSelectorOption } from '../types/views';
import { getCategoryPickerOptions, resolveCategoryForSave } from '../utils/category';
import { isoNow } from '../utils/date';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import {
  invalidateAfterCreatePersonalExpense,
  invalidateAfterCreateSplitExpense,
} from '../utils/mutationInvalidation';
import { addCents, dollarsToCents, formatAmountInputValue, splitAmountEvenly } from '../utils/money';

import { filterSplitSelectableMembers, isSplitSelectableMember } from '../utils/groupParticipants';

const logger = createLogger('useAddExpenseForm');

function sanitizeAmountInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) {
    return cleaned;
  }
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
}

export interface UseGroupsResult {
  groups: GroupSelectorOption[];
  loading: boolean;
  initialLoading: boolean;
  refreshing: boolean;
  hasLoadedOnce: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAddExpenseForm(initialGroupId: string | undefined, groupsQuery: UseGroupsResult) {
  const { versions, invalidate } = useAppData();
  const userId = getCurrentUserId();

  const [kind, setKind] = useState<ExpenseType>('split');
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(initialGroupId);
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [amountText, setAmountText] = useState('');
  const [categoryKey, setCategoryKey] = useState<CategoryKey | ''>('');
  const [payerMemberId, setPayerMemberId] = useState('');
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | undefined>();

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [submitError, setSubmitError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const amountCents = dollarsToCents(amountText);
  const categories = useMemo(() => getCachedCategories(), [versions.expenses]);

  const categoryOptions: CategoryOption[] = useMemo(
    () =>
      getCategoryPickerOptions(categories).map((item) => ({
        key: item.key,
        id: item.dbId,
        label: item.label,
      })),
    [categories],
  );

  useEffect(() => {
    if (!categoryKey && categoryOptions.length > 0) {
      setCategoryKey(categoryOptions[0].key);
    }
  }, [categoryKey, categoryOptions]);

  const selectedGroup = useMemo(
    () => groupsQuery.groups.find((group) => group.id === selectedGroupId) ?? null,
    [groupsQuery.groups, selectedGroupId],
  );

  const selectableMembers = useMemo(() => filterSplitSelectableMembers(members), [members]);
  const payerMembers = selectableMembers;

  const selectedGroupRecord = selectedGroupId ? getGroupById(selectedGroupId) : undefined;
  const isOwner = selectedGroupRecord?.ownerId === userId;

  useEffect(() => {
    logger.info('Add expense screen opened', { initialGroupId });
  }, [initialGroupId]);

  useEffect(() => {
    if (initialGroupId) {
      setSelectedGroupId(initialGroupId);
    }
  }, [initialGroupId]);

  const loadMembers = useCallback(async (groupId: string) => {
    setMembersLoading(true);
    logger.info('Group members fetch started', { groupId });
    try {
      const rows = await getGroupMembersWithProfiles(groupId);
      const selectable = filterSplitSelectableMembers(rows);
      setMembers(selectable);
      const selectableIds = selectable.map((m) => m.id);
      setSplitMemberIds(selectableIds);

      const currentMember = selectable.find((m) => m.userId === userId && isSplitSelectableMember(m));
      setPayerMemberId(currentMember?.id ?? selectableIds[0] ?? '');

      const equalMap: Record<string, string> = {};
      for (const id of selectableIds) {
        equalMap[id] = '';
      }
      setCustomAmounts(equalMap);

      logger.info('Group members fetch succeeded', { groupId, count: selectable.length });
    } catch (error) {
      logger.error('Group members fetch failed', error, { groupId });
      setMembers([]);
      setSplitMemberIds([]);
      setPayerMemberId('');
    } finally {
      setMembersLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (kind !== 'split' || !selectedGroupId) {
      return;
    }
    void loadMembers(selectedGroupId);
  }, [kind, selectedGroupId, loadMembers]);

  const selectGroup = useCallback((groupId: string) => {
    logger.info('Group selected for expense', { groupId });
    setSelectedGroupId(groupId);
    setSubmitError(undefined);
  }, []);

  const onAmountChange = useCallback((value: string) => {
    setAmountText(sanitizeAmountInput(value));
  }, []);

  const equalShares = useMemo(() => {
    if (splitMemberIds.length === 0 || amountCents <= 0) {
      return [] as number[];
    }
    return splitAmountEvenly(amountCents, splitMemberIds.length);
  }, [amountCents, splitMemberIds]);

  const customShareCentsByMember = useMemo(() => {
    const map: Record<string, number> = {};
    for (const memberId of splitMemberIds) {
      const raw = customAmounts[memberId] ?? '';
      map[memberId] = dollarsToCents(raw);
    }
    return map;
  }, [customAmounts, splitMemberIds]);

  const previewRows: SplitPreviewRow[] = useMemo(() => {
    return splitMemberIds
      .map((memberId, index) => {
        const member = members.find((m) => m.id === memberId);
        if (!member) {
          return null;
        }
        const amount =
          splitMethod === 'equal'
            ? equalShares[index] ?? 0
            : customShareCentsByMember[memberId] ?? 0;
        return { member, amountCents: amount };
      })
      .filter(Boolean) as SplitPreviewRow[];
  }, [customShareCentsByMember, equalShares, members, splitMemberIds, splitMethod]);

  const customAssignedTotal = useMemo(
    () => addCents(splitMemberIds.map((id) => customShareCentsByMember[id] ?? 0)),
    [customShareCentsByMember, splitMemberIds],
  );

  const customSplitValid = splitMethod !== 'custom' || (amountCents > 0 && customAssignedTotal === amountCents);

  const validationError = useMemo(() => {
    if (amountCents <= 0) {
      return 'Please enter an amount.';
    }
    if (kind === 'split') {
      if (!selectedGroupId) {
        return 'Please select a group.';
      }
      if (!payerMemberId) {
        return 'Please choose who paid.';
      }
      if (splitMemberIds.length === 0) {
        return 'Please choose at least one person to split with.';
      }
      if (!customSplitValid) {
        return 'Custom split total must equal the expense amount.';
      }
    }
    if (!categoryKey) {
      return 'Please select a category.';
    }
    return undefined;
  }, [amountCents, categoryKey, customSplitValid, kind, payerMemberId, selectedGroupId, splitMemberIds.length]);

  const canSave = !saving && !validationError;

  const fillRemaining = useCallback(() => {
    if (splitMemberIds.length === 0) {
      return;
    }
    const assigned = addCents(
      splitMemberIds.slice(0, -1).map((id) => customShareCentsByMember[id] ?? 0),
    );
    const remaining = Math.max(0, amountCents - assigned);
    const lastId = splitMemberIds[splitMemberIds.length - 1];
    setCustomAmounts((current) => ({
      ...current,
      [lastId]: formatAmountInputValue(remaining),
    }));
  }, [amountCents, customShareCentsByMember, splitMemberIds]);

  const resetEqualCustom = useCallback(() => {
    if (splitMemberIds.length === 0 || amountCents <= 0) {
      return;
    }
    const shares = splitAmountEvenly(amountCents, splitMemberIds.length);
    const next: Record<string, string> = {};
    splitMemberIds.forEach((id, index) => {
      next[id] = formatAmountInputValue(shares[index] ?? 0);
    });
    setCustomAmounts(next);
  }, [amountCents, splitMemberIds]);

  useEffect(() => {
    if (splitMethod === 'custom' && amountCents > 0) {
      const allEmpty = splitMemberIds.every((id) => !(customAmounts[id] ?? '').trim());
      if (allEmpty) {
        resetEqualCustom();
      }
    }
  }, [splitMethod, amountCents, splitMemberIds, customAmounts, resetEqualCustom]);

  const refreshMembers = useCallback(async () => {
    if (!selectedGroupId) {
      return;
    }
    await loadMembers(selectedGroupId);
  }, [loadMembers, selectedGroupId]);

  const save = useCallback(async () => {
    if (!canSave) {
      setSubmitError(validationError);
      return false;
    }

    setSaving(true);
    setSubmitError(undefined);
    const { categoryId, categoryName } = resolveCategoryForSave(categoryKey, categories);
    const description = note.trim() || categoryName;
    const expenseDate = isoNow();

    try {
      if (kind === 'personal') {
        logger.info('Create personal expense started');
        await createPersonalExpense({
          amountCents,
          categoryId,
          categoryName,
          description,
          note: note.trim() || undefined,
          expenseDate,
          receiptLocalUri: receiptUri,
        });
        logger.info('Create personal expense succeeded');
      } else {
        const splits =
          splitMethod === 'equal'
            ? splitMemberIds.map((memberId, index) => ({
                memberId,
                shareAmountCents: equalShares[index] ?? 0,
              }))
            : splitMemberIds.map((memberId) => ({
                memberId,
                shareAmountCents: customShareCentsByMember[memberId] ?? 0,
              }));

        logger.info('Create split expense started', { groupId: selectedGroupId, splitCount: splits.length });
        await createSplitExpense({
          groupId: selectedGroupId!,
          payerMemberId,
          amountCents,
          categoryId,
          categoryName,
          description,
          note: note.trim() || undefined,
          expenseDate,
          splitMethod,
          splits,
          receiptLocalUri: receiptUri,
        });
        logger.info('Create split expense succeeded', { groupId: selectedGroupId });
      }

      if (kind === 'personal') {
        invalidateAfterCreatePersonalExpense(invalidate);
      } else {
        invalidateAfterCreateSplitExpense(invalidate, selectedGroupId!);
      }
      return true;
    } catch (error) {
      logger.error('Add expense save failed', error, { kind, groupId: selectedGroupId });
      setSubmitError(toUserFriendlyError(error, 'Unable to save expense.'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    amountCents,
    canSave,
    categories,
    categoryKey,
    customShareCentsByMember,
    equalShares,
    kind,
    note,
    payerMemberId,
    receiptUri,
    invalidate,
    selectedGroupId,
    splitMemberIds,
    splitMethod,
    validationError,
  ]);

  return {
    title: UI_COPY.addExpenseTitle,
    kind,
    setKind,
    groups: groupsQuery.groups,
    groupsLoading: groupsQuery.loading,
    groupsInitialLoading: groupsQuery.initialLoading,
    groupsError: groupsQuery.error,
    refetchGroups: groupsQuery.refetch,
    selectedGroup,
    selectedGroupId,
    selectGroup,
    showGroupModal,
    setShowGroupModal,
    members,
    membersLoading,
    activeMembers: selectableMembers,
    payerMembers,
    payerMemberId,
    setPayerMemberId: (id: string) => {
      logger.info('Payer selected', { payerMemberId: id });
      setPayerMemberId(id);
    },
    splitMemberIds,
    setSplitMemberIds: (ids: string[]) => {
      logger.info('Split participants changed', { count: ids.length });
      setSplitMemberIds(ids);
    },
    showSplitModal,
    setShowSplitModal,
    showInviteModal,
    setShowInviteModal,
    isOwner,
    refreshMembers,
    amountText,
    amountCents,
    onAmountChange,
    categoryKey,
    setCategoryKey,
    categoryOptions,
    splitMethod,
    setSplitMethod,
    customAmounts,
    setCustomAmount: (memberId: string, value: string) => {
      setCustomAmounts((current) => ({ ...current, [memberId]: sanitizeAmountInput(value) }));
    },
    fillRemaining,
    resetEqualCustom,
    note,
    setNote,
    receiptUri,
    setReceiptUri,
    previewRows,
    customAssignedTotal,
    customSplitValid,
    validationError,
    submitError,
    canSave,
    saving,
    save,
    ctaLabel: saving ? 'Saving…' : 'Save Expense',
  };
}
