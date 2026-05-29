import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppData } from '../context/AppDataContext';
import { UI_COPY } from '../data/constants';
import type { CategoryOption } from '../components/form/CategoryGrid';
import type { CategoryKey } from '../constants/categories';
import type { SplitPreviewRow } from '../components/expenses/SplitPreviewCard';
import { getCachedCategories } from '../services/categoryService';
import { createPersonalExpense, createSplitExpense } from '../services/expenseService';
import {
  getCurrentUserId,
  getGroupById,
  isGroupActiveForNewExpenses,
  INACTIVE_GROUP_EXPENSE_MESSAGE,
} from '../services/groupService';
import type { ExpenseType, SplitMethod } from '../types/models';
import type { CurrencyCode } from '../types/currency';
import { normalizeCurrencyCode } from '../types/currency';
import type { ReceiptConversionMetadata } from '../types/inputs';
import type { GroupSelectorOption } from '../types/views';
import { getCategoryPickerOptions, resolveCategoryForSave } from '../utils/category';
import { isoNow } from '../utils/date';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import {
  invalidateAfterCreatePersonalExpense,
  invalidateAfterCreateSplitExpense,
} from '../utils/mutationInvalidation';
import { addCents, splitAmountEvenly } from '../utils/money';
import {
  formatAmountInputValue,
  parseAmountInput,
  sanitizeAmountInput,
} from '../utils/currency';
import { getProfile } from '../services/profileService';

import { isSplitSelectableMember } from '../utils/groupParticipants';
import { useGroupParticipants } from './useGroupParticipants';

export interface UseGroupsResult {
  groups: GroupSelectorOption[];
  loading: boolean;
  initialLoading: boolean;
  refreshing: boolean;
  hasLoadedOnce: boolean;
  error: string | null;
  refetch: () => void;
}

const logger = createLogger('useAddExpenseForm');

export interface AddExpensePrefill {
  source?: string;
  amountCents?: number;
  currency?: CurrencyCode;
  receiptUri?: string;
  expenseType?: ExpenseType;
  originalAmountMinor?: number;
  originalCurrency?: CurrencyCode;
  exchangeRate?: number;
  exchangeRateTimestamp?: string;
  exchangeRateProvider?: string;
}

export function useAddExpenseForm(
  initialGroupId: string | undefined,
  groupsQuery: UseGroupsResult,
  prefill?: AddExpensePrefill,
) {
  const { versions, invalidate } = useAppData();
  const userId = getCurrentUserId();
  const profile = getProfile();
  const defaultCurrency = normalizeCurrencyCode(prefill?.currency ?? profile?.defaultCurrency);
  const receiptConversion: ReceiptConversionMetadata | undefined =
    prefill?.originalAmountMinor && prefill.originalCurrency
      ? {
          originalAmountMinor: prefill.originalAmountMinor,
          originalCurrency: prefill.originalCurrency,
          convertedAmountMinor: prefill.amountCents,
          convertedCurrency: defaultCurrency,
          exchangeRate: prefill.exchangeRate,
          exchangeRateTimestamp: prefill.exchangeRateTimestamp,
          exchangeRateProvider: prefill.exchangeRateProvider,
        }
      : undefined;

  const [kind, setKind] = useState<ExpenseType>(prefill?.expenseType ?? 'split');
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(initialGroupId);
  const participantGroupId = kind === 'split' ? selectedGroupId : undefined;
  const {
    members,
    loading: membersLoading,
    refreshing: membersRefreshing,
    refresh: refreshMembers,
  } = useGroupParticipants(participantGroupId, 'split');

  const [amountText, setAmountText] = useState(
    prefill?.amountCents && prefill.amountCents > 0
      ? formatAmountInputValue(prefill.amountCents, defaultCurrency)
      : '',
  );
  const [categoryKey, setCategoryKey] = useState<CategoryKey | ''>('');
  const [payerMemberId, setPayerMemberId] = useState('');
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | undefined>(prefill?.receiptUri);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [submitError, setSubmitError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const amountCents = parseAmountInput(amountText, defaultCurrency);
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

  const selectableMembers = members;
  const payerMembers = selectableMembers;

  const selectedGroupRecord = selectedGroupId ? getGroupById(selectedGroupId) : undefined;
  const isOwner = selectedGroupRecord?.ownerId === userId;
  const selectedGroupInactive = selectedGroupRecord
    ? !isGroupActiveForNewExpenses(selectedGroupRecord)
    : false;

  useEffect(() => {
    if (initialGroupId) {
      setSelectedGroupId(initialGroupId);
    }
  }, [initialGroupId]);

  useEffect(() => {
    if (!selectedGroupId || kind !== 'split') {
      return;
    }
    const group = getGroupById(selectedGroupId);
    if (group && !isGroupActiveForNewExpenses(group)) {
      setSelectedGroupId(undefined);
      setSubmitError(INACTIVE_GROUP_EXPENSE_MESSAGE);
    }
  }, [kind, selectedGroupId, versions.groups]);

  useEffect(() => {
    if (kind !== 'split' || members.length === 0) {
      return;
    }

    const selectableIds = members.map((member) => member.id);
    setSplitMemberIds((current) => {
      const retained = current.filter((id) => selectableIds.includes(id));
      return retained.length > 0 ? retained : selectableIds;
    });
    setPayerMemberId((current) =>
      current && selectableIds.includes(current)
        ? current
        : members.find((member) => member.userId === userId && isSplitSelectableMember(member))?.id ??
            selectableIds[0] ??
            '',
    );
    setCustomAmounts((current) => {
      const next: Record<string, string> = {};
      for (const id of selectableIds) {
        next[id] = current[id] ?? '';
      }
      return next;
    });
  }, [kind, members, userId]);

  const selectGroup = useCallback((groupId: string) => {
    setSelectedGroupId(groupId);
    setSubmitError(undefined);
  }, []);

  const onAmountChange = useCallback((value: string) => {
    setAmountText(sanitizeAmountInput(value, defaultCurrency));
  }, [defaultCurrency]);

  const equalShares = useMemo(() => {
    if (splitMemberIds.length === 0 || amountCents <= 0) {
      return [] as number[];
    }
    return splitAmountEvenly(amountCents, splitMemberIds.length);
  }, [amountCents, defaultCurrency, splitMemberIds]);

  const customShareCentsByMember = useMemo(() => {
    const map: Record<string, number> = {};
    for (const memberId of splitMemberIds) {
      const raw = customAmounts[memberId] ?? '';
      map[memberId] = parseAmountInput(raw, defaultCurrency);
    }
    return map;
  }, [customAmounts, defaultCurrency, splitMemberIds]);

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
      if (selectedGroupInactive) {
        return INACTIVE_GROUP_EXPENSE_MESSAGE;
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
  }, [amountCents, categoryKey, customSplitValid, kind, payerMemberId, selectedGroupId, selectedGroupInactive, splitMemberIds.length]);

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
      [lastId]: formatAmountInputValue(remaining, defaultCurrency),
    }));
  }, [amountCents, customShareCentsByMember, defaultCurrency, splitMemberIds]);

  const resetEqualCustom = useCallback(() => {
    if (splitMemberIds.length === 0 || amountCents <= 0) {
      return;
    }
    const shares = splitAmountEvenly(amountCents, splitMemberIds.length);
    const next: Record<string, string> = {};
    splitMemberIds.forEach((id, index) => {
      next[id] = formatAmountInputValue(shares[index] ?? 0, defaultCurrency);
    });
    setCustomAmounts(next);
  }, [amountCents, defaultCurrency, splitMemberIds]);

  useEffect(() => {
    if (splitMethod === 'custom' && amountCents > 0) {
      const allEmpty = splitMemberIds.every((id) => !(customAmounts[id] ?? '').trim());
      if (allEmpty) {
        resetEqualCustom();
      }
    }
  }, [splitMethod, amountCents, splitMemberIds, customAmounts, resetEqualCustom]);

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
        await createPersonalExpense({
          amountCents,
          currency: defaultCurrency,
          categoryId,
          categoryName,
          description,
          note: note.trim() || undefined,
          expenseDate,
          receiptLocalUri: receiptUri,
          receiptConversion,
        });
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

        await createSplitExpense({
          groupId: selectedGroupId!,
          payerMemberId,
          amountCents,
          currency: defaultCurrency,
          categoryId,
          categoryName,
          description,
          note: note.trim() || undefined,
          expenseDate,
          splitMethod,
          splits,
          receiptLocalUri: receiptUri,
          receiptConversion,
        });
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
    defaultCurrency,
    equalShares,
    kind,
    note,
    payerMemberId,
    receiptConversion,
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
    membersRefreshing,
    activeMembers: selectableMembers,
    payerMembers,
    payerMemberId,
    setPayerMemberId,
    splitMemberIds,
    setSplitMemberIds,
    showSplitModal,
    setShowSplitModal,
    showInviteModal,
    setShowInviteModal,
    isOwner,
    refreshMembers,
    amountText,
    amountCents,
    currency: defaultCurrency,
    onAmountChange,
    categoryKey,
    setCategoryKey,
    categoryOptions,
    splitMethod,
    setSplitMethod,
    customAmounts,
    setCustomAmount: (memberId: string, value: string) => {
      setCustomAmounts((current) => ({
        ...current,
        [memberId]: sanitizeAmountInput(value, defaultCurrency),
      }));
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
