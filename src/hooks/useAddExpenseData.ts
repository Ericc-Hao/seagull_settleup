import { useMemo, useState } from 'react';

import { useAppData } from '../context/AppDataContext';
import { UI_COPY } from '../data/constants';
import type { ExpenseType, SplitMethod } from '../types/models';
import { getGroupMembersByGroup } from '../services/memberService';
import { createExpense } from '../services/expenseService';
import { getCachedCategories } from '../services/categoryService';
import { getCurrentUserId } from '../services/groupService';
import { dollarsToCents, formatCAD, splitAmountEvenly } from '../utils/money';
import { isoNow } from '../utils/date';
import { createLogger } from '../utils/logger';
import {
  invalidateAfterCreatePersonalExpense,
  invalidateAfterCreateSplitExpense,
} from '../utils/mutationInvalidation';
import { getCategoryPickerOptions } from '../utils/category';

const logger = createLogger('useAddExpenseData');

export function useAddExpenseData(groupId: string) {
  const { versions, getGroupDetailVersion, invalidate } = useAppData();
  const groupDetailVersion = getGroupDetailVersion(groupId);
  const members = useMemo(() => getGroupMembersByGroup(groupId), [groupId, versions.groups, groupDetailVersion]);
  const categories = useMemo(() => getCachedCategories(), [versions.expenses]);

  const [kind, setKind] = useState<ExpenseType>('split');
  const [amountRaw, setAmountRaw] = useState('');
  const [category, setCategory] = useState('');
  const [payerId, setPayerId] = useState(members[0]?.id ?? '');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [note, setNote] = useState('');
  const [includedIds, setIncludedIds] = useState<string[]>(() => members.map((m) => m.id));
  const [saving, setSaving] = useState(false);

  const amountCents = dollarsToCents(amountRaw);
  const perPersonAmounts =
    kind === 'split' && includedIds.length > 0
      ? splitAmountEvenly(amountCents, includedIds.length)
      : [];

  const splitPreview = useMemo(() => {
    return includedIds.map((memberId, index) => {
      const member = members.find((m) => m.id === memberId);
      return {
        id: memberId,
        name: member?.displayName ?? memberId,
        amount: formatCAD(perPersonAmounts[index] ?? 0),
      };
    });
  }, [includedIds, members, perPersonAmounts]);

  const toggleMember = (memberId: string) => {
    setIncludedIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const save = async () => {
    setSaving(true);
    logger.info('Add expense submit started', { groupId, type: kind });
    try {
      const userId = getCurrentUserId();
      const selectedCategory = categories.find((item) => item.id === category);
      const categoryName = selectedCategory?.name ?? '';
      if (kind === 'personal') {
        await createExpense({
          type: 'personal',
          userId,
          amountCents,
          categoryId: selectedCategory?.id,
          category: categoryName,
          description: note || categoryName || 'Expense',
          note: note || undefined,
          expenseDate: isoNow(),
        });
      } else {
        await createExpense({
          type: 'split',
          userId,
          groupId,
          payerMemberId: payerId,
          amountCents,
          categoryId: selectedCategory?.id,
          category: categoryName,
          description: note || categoryName || 'Expense',
          note: note || undefined,
          expenseDate: isoNow(),
          splitMethod,
          participantMemberIds: includedIds,
        });
      }
      if (kind === 'personal') {
        invalidateAfterCreatePersonalExpense(invalidate);
      } else {
        invalidateAfterCreateSplitExpense(invalidate, groupId);
      }
      logger.info('Add expense submit succeeded', { groupId, type: kind });
    } catch (error) {
      logger.error('Add expense submit failed', error, { groupId, type: kind });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    title: UI_COPY.addExpenseTitle,
    amountDisplay: formatCAD(amountCents),
    amountRaw,
    setAmountRaw,
    kind,
    setKind,
    category,
    setCategory,
    payerId,
    setPayerId,
    splitMethod,
    setSplitMethod,
    note,
    setNote,
    members: members.map((m) => ({
      id: m.id,
      name: m.displayName,
      label: m.nickname ?? m.displayName.charAt(0),
      included: includedIds.includes(m.id),
    })),
    categories: getCategoryPickerOptions(categories).map((item) => ({
      key: item.key,
      id: item.dbId,
      label: item.label,
    })),
    splitPreview,
    toggleMember,
    save,
    saving,
    ctaLabel: 'Save Expense',
  };
}
