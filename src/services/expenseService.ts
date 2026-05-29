import { buildEqualSplits } from '../core/settlement';
import { mapExpense } from '../lib/mappers';
import { supabase } from '../lib/supabase';
import type {
  CreateExpenseInput,
  CreatePersonalExpenseInput,
  CreateSplitExpenseInput,
  ReceiptConversionMetadata,
  UpdateExpenseInput,
} from '../types/inputs';
import type { Expense, Group } from '../types/models';
import type {
  CurrentUserMonthlyExpenseSummary,
  ExpenseDetailView,
  ExpenseListItemView,
  ExpenseReceiptView,
  ExpensesSummaryView,
  RecentGroupExpenseView,
  SplitExpenseSettlementStatus,
  SplitExpenseWithMyShare,
} from '../types/views';
import { isInMonth, formatMonthYearOverview, isoNow } from '../utils/date';
import { createLogger } from '../utils/logger';
import { getCategoryConfig } from '../utils/category';
import { addCents, formatCAD } from '../utils/money';
import {
  findMemberForUser,
  getExpenseSplits,
  getGroupExpenses,
  getGroupMembers,
  readDb,
} from './dbHelpers';
import { getCurrentUserId, getGroupById } from './groupService';
import { isActiveGroupStatus, INACTIVE_GROUP_EXPENSE_MESSAGE } from './groupAccess';
import { createReceipt, getExpenseReceiptView, toExpenseReceiptView } from './receiptService';
import { getSettleableMembersWithProfiles, getCurrentUserGroupBalanceSummary } from './settlementService';
import { resolveMemberWithProfile } from './memberService';
import { isPendingParticipant } from '../utils/groupParticipants';
import { uploadReceiptImage } from './storageService';

const logger = createLogger('expenseService');

export function getExpenses(): Expense[] {
  return readDb().expenses.filter((expense) => !expense.deletedAt);
}

export function getExpensesByGroup(groupId: string): Expense[] {
  return getGroupExpenses(groupId);
}

function computeUserExpenseSettlementStatus(
  splitCount: number,
  includedInSplit: boolean,
  isGroupSettled: boolean,
): SplitExpenseSettlementStatus {
  if (splitCount === 0) {
    return 'not_split';
  }
  if (!includedInSplit) {
    return 'settled';
  }
  if (isGroupSettled) {
    return 'settled';
  }
  return 'not_settled';
}

function toRecentGroupExpenseView(
  expense: Expense,
  userId: string,
  isGroupSettled: boolean,
  db = readDb(),
): RecentGroupExpenseView {
  const splits = getExpenseSplits(expense.id, db);
  const splitCount = splits.length;
  const member = expense.groupId ? findMemberForUser(expense.groupId, userId, db) : undefined;
  const userSplit = member ? splits.find((entry) => entry.memberId === member.id) : undefined;
  const includedInSplit = Boolean(userSplit);
  const config = getCategoryConfig({
    categoryId: expense.categoryId,
    categoryName: expense.category,
    expenseId: expense.id,
  });
  const settlementStatus = computeUserExpenseSettlementStatus(splitCount, includedInSplit, isGroupSettled);

  logger.debug('Expense settlement status computed', {
    expenseId: expense.id,
    groupId: expense.groupId,
    settlementStatus,
    splitCount,
    includedInSplit,
  });

  return {
    expenseId: expense.id,
    groupId: expense.groupId ?? '',
    title: expense.description,
    categoryName: config.label,
    categoryKey: config.key,
    categoryId: expense.categoryId,
    totalAmountCents: expense.amountCents,
    myShareAmountCents: userSplit?.shareAmountCents ?? 0,
    payerName: resolvePayerName(expense, db),
    expenseDate: expense.expenseDate,
    splitCount,
    settlementStatus,
    includedInSplit,
    groupName: expense.groupId
      ? db.groups.find((group) => group.id === expense.groupId)?.name
      : undefined,
  };
}

function buildGroupSettledCache(userId: string, db = readDb()): Map<string, boolean> {
  const cache = new Map<string, boolean>();
  for (const group of db.groups) {
    if (group.deletedAt) {
      continue;
    }
    cache.set(
      group.id,
      getCurrentUserGroupBalanceSummary(group.id, userId).adjustedBalanceCents === 0,
    );
  }
  return cache;
}

export function getRecentGroupExpensesForCurrentUser(
  groupId: string,
  limit = 5,
  userId: string = getCurrentUserId(),
): RecentGroupExpenseView[] {
  logger.info('Fetch recent group expenses started', { groupId, limit });
  try {
    const db = readDb();
    const isGroupSettled =
      getCurrentUserGroupBalanceSummary(groupId, userId).adjustedBalanceCents === 0;
    const expenses = getGroupExpenses(groupId, db)
      .filter((expense) => !expense.deletedAt && expense.type === 'split')
      .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
      .slice(0, limit)
      .map((expense) => toRecentGroupExpenseView(expense, userId, isGroupSettled, db));

    logger.info('Fetch recent group expenses succeeded', { groupId, count: expenses.length });
    return expenses;
  } catch (error) {
    logger.error('Fetch recent group expenses failed', error, { groupId, limit });
    throw error;
  }
}

export function listSplitExpenseCardItems(userId: string = getCurrentUserId()): RecentGroupExpenseView[] {
  const db = readDb();
  const settledByGroup = buildGroupSettledCache(userId, db);

  return db.expenses
    .filter((expense) => !expense.deletedAt && expense.type === 'split' && expense.groupId)
    .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
    .map((expense) =>
      toRecentGroupExpenseView(
        expense,
        userId,
        settledByGroup.get(expense.groupId!) ?? false,
        db,
      ),
    );
}

export function listGroupExpenseItems(
  groupId: string,
  limit = 5,
  userId: string = getCurrentUserId(),
): RecentGroupExpenseView[] {
  return getRecentGroupExpensesForCurrentUser(groupId, limit, userId);
}

export function getPersonalExpenses(userId: string = getCurrentUserId()): Expense[] {
  return getExpenses().filter((expense) => expense.type === 'personal' && expense.userId === userId);
}

export function getExpenseById(expenseId: string): Expense | undefined {
  return readDb().expenses.find((expense) => expense.id === expenseId);
}

function getMySplitShareCents(
  expense: Expense,
  userId: string,
  db = readDb(),
): number {
  if (expense.type !== 'split' || !expense.groupId) {
    return 0;
  }
  const member = findMemberForUser(expense.groupId, userId, db);
  if (!member) {
    return 0;
  }
  const split = getExpenseSplits(expense.id, db).find((entry) => entry.memberId === member.id);
  return split?.shareAmountCents ?? 0;
}

export function memberHasExpenseParticipation(memberId: string, db = readDb()): boolean {
  const asPayer = db.expenses.some(
    (expense) => !expense.deletedAt && expense.payerMemberId === memberId,
  );
  const asSplit = db.expenseSplits.some((split) => split.memberId === memberId);
  return asPayer || asSplit;
}

function resolvePayerName(expense: Expense, db = readDb()): string | undefined {
  if (!expense.payerMemberId || !expense.groupId) {
    return undefined;
  }
  return resolveMemberWithProfile(expense.payerMemberId, expense.groupId, db)?.displayName;
}

function toSplitExpenseWithMyShare(
  expense: Expense,
  userId: string,
  db = readDb(),
): SplitExpenseWithMyShare | undefined {
  if (expense.type !== 'split' || !expense.groupId) {
    return undefined;
  }
  const member = findMemberForUser(expense.groupId, userId, db);
  if (!member) {
    return undefined;
  }
  const split = getExpenseSplits(expense.id, db).find((entry) => entry.memberId === member.id);
  if (!split) {
    return undefined;
  }
  const groupName = db.groups.find((group) => group.id === expense.groupId)?.name ?? 'Group';
  const config = getCategoryConfig({
    categoryId: expense.categoryId,
    categoryName: expense.category,
    expenseId: expense.id,
  });
  return {
    expenseId: expense.id,
    groupId: expense.groupId,
    groupName,
    categoryName: config.label,
    description: expense.description,
    totalAmountCents: expense.amountCents,
    myShareAmountCents: split.shareAmountCents,
    expenseDate: expense.expenseDate,
    payerMemberId: expense.payerMemberId,
    payerName: resolvePayerName(expense, db),
  };
}

function toListItem(expense: Expense, userId: string = getCurrentUserId()): ExpenseListItemView {
  const config = getCategoryConfig({
    categoryId: expense.categoryId,
    categoryName: expense.category,
    expenseId: expense.id,
  });
  const db = readDb();
  const groupName = expense.groupId
    ? db.groups.find((group) => group.id === expense.groupId)?.name
    : undefined;

  if (expense.type === 'split') {
    const myShareAmountCents = getMySplitShareCents(expense, userId, db);
    const totalAmountCents = expense.amountCents;
    const detailParts = [groupName, `Total ${formatCAD(totalAmountCents)}`].filter(Boolean);
    return {
      id: expense.id,
      label: expense.description,
      subtitle: 'Your share',
      detailText: detailParts.join(' · '),
      amount: formatCAD(myShareAmountCents),
      amountCents: myShareAmountCents,
      myShareAmountCents,
      totalAmountCents,
      icon: config.icon,
      tint: config.tint,
      bg: config.bg,
      categoryKey: config.key,
      categoryName: config.label,
      categoryId: expense.categoryId,
      groupId: expense.groupId,
      type: expense.type,
    };
  }

  return {
    id: expense.id,
    label: expense.description,
    subtitle: groupName,
    amount: formatCAD(expense.amountCents),
    amountCents: expense.amountCents,
    icon: config.icon,
    tint: config.tint,
    bg: config.bg,
    categoryKey: config.key,
    categoryName: config.label,
    categoryId: expense.categoryId,
    groupId: expense.groupId,
    type: expense.type,
  };
}

export function listExpenseItems(
  filter: 'all' | 'personal' | 'split',
  userId: string = getCurrentUserId(),
): ExpenseListItemView[] {
  const db = readDb();
  return db.expenses
    .filter((expense) => !expense.deletedAt)
    .filter((expense) => {
      if (filter === 'personal') {
        return expense.type === 'personal' && expense.userId === userId;
      }
      if (filter === 'split') {
        return expense.type === 'split';
      }
      return expense.userId === userId || expense.type === 'split';
    })
    .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
    .map((expense) => toListItem(expense, userId));
}

export function getCurrentUserMonthlyExpenseSummary(
  month: Date = new Date(),
  userId: string = getCurrentUserId(),
): CurrentUserMonthlyExpenseSummary {
  const db = readDb();
  const monthExpenses = db.expenses.filter(
    (expense) => !expense.deletedAt && isInMonth(expense.expenseDate, month),
  );
  const personalExpenses = monthExpenses.filter(
    (expense) => expense.type === 'personal' && expense.userId === userId,
  );
  const personalTotalCents = addCents(personalExpenses.map((expense) => expense.amountCents));
  const splitExpenses = monthExpenses
    .filter((expense) => expense.type === 'split')
    .map((expense) => toSplitExpenseWithMyShare(expense, userId, db))
    .filter((expense): expense is SplitExpenseWithMyShare => Boolean(expense));
  const splitShareTotalCents = addCents(splitExpenses.map((expense) => expense.myShareAmountCents));

  return {
    personalTotalCents,
    splitShareTotalCents,
    totalSpentCents: personalTotalCents + splitShareTotalCents,
    personalExpenses,
    splitExpenses,
  };
}

export function getExpensesSummary(userId: string = getCurrentUserId()): ExpensesSummaryView {
  const summary = getCurrentUserMonthlyExpenseSummary(new Date(), userId);
  return {
    monthLabel: formatMonthYearOverview(),
    totalSpentCents: summary.totalSpentCents,
    personalTotalCents: summary.personalTotalCents,
    splitShareCents: summary.splitShareTotalCents,
  };
}

function buildCachedReceiptView(expense: Expense, db = readDb()): ExpenseReceiptView | null {
  const receipt =
    (expense.receiptId ? db.receipts.find((entry) => entry.id === expense.receiptId) : undefined) ??
    db.receipts.find((entry) => entry.expenseId === expense.id);

  if (!receipt) {
    return null;
  }

  return toExpenseReceiptView(receipt);
}

function buildExpenseDetailView(
  expense: Expense,
  userId: string,
  db = readDb(),
): ExpenseDetailView | undefined {
  const config = getCategoryConfig({
    categoryId: expense.categoryId,
    categoryName: expense.category,
    expenseId: expense.id,
  });
  const groupName = expense.groupId
    ? db.groups.find((group) => group.id === expense.groupId)?.name
    : undefined;
  const receipt = buildCachedReceiptView(expense, db);

  if (expense.type === 'personal') {
    return {
      id: expense.id,
      type: 'personal',
      label: expense.description,
      categoryName: config.label,
      totalAmountCents: expense.amountCents,
      totalAmountDisplay: formatCAD(expense.amountCents),
      expenseDate: expense.expenseDate,
      splits: [],
      receipt,
    };
  }

  if (!expense.groupId) {
    return undefined;
  }

  const members = getSettleableMembersWithProfiles(expense.groupId, db);
  const currentMember = findMemberForUser(expense.groupId, userId, db);
  const splits = getExpenseSplits(expense.id, db);
  const myShareAmountCents = currentMember
    ? splits.find((split) => split.memberId === currentMember.id)?.shareAmountCents
    : undefined;

  return {
    id: expense.id,
    type: 'split',
    label: expense.description,
    categoryName: config.label,
    groupId: expense.groupId,
    groupName,
    totalAmountCents: expense.amountCents,
    totalAmountDisplay: formatCAD(expense.amountCents),
    myShareAmountCents,
    myShareAmountDisplay:
      myShareAmountCents !== undefined ? formatCAD(myShareAmountCents) : undefined,
    payerName: resolvePayerName(expense, db),
    expenseDate: expense.expenseDate,
    splits: splits
      .map((split) => {
        const member =
          resolveMemberWithProfile(split.memberId, expense.groupId!, db) ??
          members.find((entry) => entry.id === split.memberId);
        const isPending = member ? isPendingParticipant(member) : false;
        return {
          memberId: split.memberId,
          displayName: member?.displayName ?? 'Member',
          avatarUrl: member?.avatarUrl,
          avatarLabel: member?.avatarLabel ?? '?',
          shareAmountCents: split.shareAmountCents,
          shareAmountDisplay: formatCAD(split.shareAmountCents),
          isCurrentUser: split.memberId === currentMember?.id,
          invitationStatus: member?.invitationStatus,
          isPending,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    receipt,
  };
}

export interface ExpenseDetailResult {
  expense: Expense;
  group?: Group;
  payer?: { displayName: string };
  splits: ExpenseDetailView['splits'];
  receipt: ExpenseReceiptView | null;
}

export async function getExpenseDetail(expenseId: string): Promise<ExpenseDetailResult | null> {
  logger.info('Get expense detail started', { expenseId, table: 'expenses' });

  const expense = getExpenseById(expenseId);
  if (!expense || expense.deletedAt) {
    logger.info('Get expense detail not found', { expenseId, table: 'expenses' });
    return null;
  }

  const db = readDb();
  const detailView = buildExpenseDetailView(expense, getCurrentUserId(), db);
  if (!detailView) {
    return null;
  }

  const group = expense.groupId ? db.groups.find((entry) => entry.id === expense.groupId) : undefined;
  const payer = detailView.payerName ? { displayName: detailView.payerName } : undefined;

  let receipt: ExpenseReceiptView | null = null;
  try {
    receipt = await getExpenseReceiptView(expenseId, expense.receiptId);
  } catch (error) {
    logger.error('Get expense detail receipt fetch failed', error, { expenseId, table: 'receipts' });
  }

  logger.info('Get expense detail succeeded', {
    expenseId,
    hasReceipt: Boolean(receipt),
    table: 'expenses',
  });

  return {
    expense,
    group,
    payer,
    splits: detailView.splits,
    receipt,
  };
}

export function getExpenseDetailView(
  expenseId: string,
  userId: string = getCurrentUserId(),
): ExpenseDetailView | undefined {
  const expense = getExpenseById(expenseId);
  if (!expense || expense.deletedAt) {
    return undefined;
  }

  return buildExpenseDetailView(expense, userId);
}

async function attachReceiptToExpense(
  expenseId: string,
  userId: string,
  groupId: string | null,
  receiptLocalUri: string,
  receiptConversion?: ReceiptConversionMetadata,
): Promise<void> {
  logger.info('Receipt upload started', { expenseId, table: 'receipts' });
  const uploaded = await uploadReceiptImage(userId, expenseId, receiptLocalUri);
  const receipt = await createReceipt({
    expenseId,
    groupId: groupId ?? undefined,
    storagePath: uploaded.storagePath,
    publicUrl: uploaded.publicUrl,
    fileName: uploaded.storagePath.split('/').pop(),
    mimeType: uploaded.mimeType,
    fileSize: uploaded.fileSize,
    conversion: receiptConversion,
  });

  const { error } = await supabase.from('expenses').update({ receipt_id: receipt.id }).eq('id', expenseId);
  if (error) {
    throw error;
  }
  logger.info('Receipt upload succeeded', { expenseId, receiptId: receipt.id, table: 'receipts' });
}

async function insertExpenseSplits(expenseId: string, splits: { memberId: string; shareAmountCents: number }[]): Promise<void> {
  if (splits.length === 0) {
    return;
  }
  logger.info('Expense splits insert started', {
    table: 'expense_splits',
    expenseId,
    splitCount: splits.length,
  });
  const { error } = await supabase.from('expense_splits').insert(
    splits.map((split) => ({
      expense_id: expenseId,
      member_id: split.memberId,
      share_amount_cents: split.shareAmountCents,
    })),
  );
  if (error) {
    throw error;
  }
  logger.info('Expense splits insert succeeded', { table: 'expense_splits', expenseId });
}

export async function createPersonalExpense(input: CreatePersonalExpenseInput): Promise<Expense> {
  logger.info('Create personal expense started', { table: 'expenses' });
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw userError;
    }
    const userId = userData.user?.id;
    if (!userId) {
      throw new Error('You must be logged in to save an expense.');
    }

    const expenseDate = input.expenseDate.split('T')[0];
    const { data: expenseRow, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        group_id: null,
        type: 'personal',
        payer_member_id: null,
        user_id: userId,
        amount_cents: input.amountCents,
        currency: input.currency ?? 'CAD',
        category_id: input.categoryId ?? null,
        category_name: input.categoryName,
        description: input.description,
        note: input.note ?? null,
        expense_date: expenseDate,
      })
      .select('*')
      .single();

    if (expenseError) {
      throw expenseError;
    }

    const expense = mapExpense(expenseRow);
    logger.info('Create personal expense insert succeeded', { table: 'expenses', expenseId: expense.id });

    if (input.receiptLocalUri) {
      await attachReceiptToExpense(expense.id, userId, null, input.receiptLocalUri, input.receiptConversion);
    }

    logger.info('Create personal expense succeeded', { table: 'expenses', expenseId: expense.id });
    return getExpenseById(expense.id) ?? expense;
  } catch (error) {
    logger.error('Create personal expense failed', error, { table: 'expenses' });
    throw error;
  }
}

export async function createSplitExpense(input: CreateSplitExpenseInput): Promise<Expense> {
  logger.info('Create split expense started', { table: 'expenses', groupId: input.groupId });
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw userError;
    }
    const userId = userData.user?.id;
    if (!userId) {
      throw new Error('You must be logged in to save an expense.');
    }

    const cachedGroup = getGroupById(input.groupId);
    if (cachedGroup && !isActiveGroupStatus(cachedGroup.status)) {
      throw new Error(INACTIVE_GROUP_EXPENSE_MESSAGE);
    }

    const { data: groupRow, error: groupError } = await supabase
      .from('groups')
      .select('status')
      .eq('id', input.groupId)
      .maybeSingle();
    if (groupError) {
      throw groupError;
    }
    if (!groupRow || !isActiveGroupStatus(groupRow.status as Group['status'])) {
      throw new Error(INACTIVE_GROUP_EXPENSE_MESSAGE);
    }

    const expenseDate = input.expenseDate.split('T')[0];
    const { data: expenseRow, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        group_id: input.groupId,
        type: 'split',
        payer_member_id: input.payerMemberId,
        user_id: userId,
        amount_cents: input.amountCents,
        currency: input.currency ?? 'CAD',
        category_id: input.categoryId ?? null,
        category_name: input.categoryName,
        description: input.description,
        note: input.note ?? null,
        expense_date: expenseDate,
      })
      .select('*')
      .single();

    if (expenseError) {
      throw expenseError;
    }

    const expense = mapExpense(expenseRow);
    logger.info('Create split expense insert succeeded', { table: 'expenses', expenseId: expense.id });

    await insertExpenseSplits(expense.id, input.splits);

    if (input.receiptLocalUri) {
      await attachReceiptToExpense(
        expense.id,
        userId,
        input.groupId,
        input.receiptLocalUri,
        input.receiptConversion,
      );
    }

    logger.info('Create split expense succeeded', { table: 'expenses', expenseId: expense.id, groupId: input.groupId });
    return getExpenseById(expense.id) ?? expense;
  } catch (error) {
    logger.error('Create split expense failed', error, { table: 'expenses', groupId: input.groupId });
    throw error;
  }
}

/** @deprecated Use createPersonalExpense or createSplitExpense */
export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  if (input.type === 'personal') {
    return createPersonalExpense({
      amountCents: input.amountCents,
      currency: input.currency,
      categoryId: input.categoryId,
      categoryName: input.category,
      description: input.description,
      note: input.note,
      expenseDate: input.expenseDate,
      receiptLocalUri: input.receiptLocalUri,
    });
  }

  const participantIds =
    input.participantMemberIds ?? (input.groupId ? getGroupMembers(input.groupId).map((member) => member.id) : []);
  const splits =
    input.customSplits ??
    buildEqualSplits(participantIds, input.amountCents).map((split) => ({
      memberId: split.memberId,
      shareAmountCents: split.shareAmountCents,
    }));

  if (!input.groupId || !input.payerMemberId) {
    throw new Error('Split expenses require a group and payer.');
  }

  return createSplitExpense({
    groupId: input.groupId,
    payerMemberId: input.payerMemberId,
    amountCents: input.amountCents,
    currency: input.currency,
    categoryId: input.categoryId,
    categoryName: input.category,
    description: input.description,
    note: input.note,
    expenseDate: input.expenseDate,
    splitMethod: input.splitMethod ?? 'equal',
    splits,
    receiptLocalUri: input.receiptLocalUri,
  });
}

export async function updateExpense(expenseId: string, input: UpdateExpenseInput): Promise<Expense> {
  const { error } = await supabase
    .from('expenses')
    .update({
      amount_cents: input.amountCents,
      category_id: input.categoryId,
      category_name: input.category,
      description: input.description,
      note: input.note,
      receipt_id: input.receiptId,
      expense_date: input.expenseDate?.split('T')[0],
      payer_member_id: input.payerMemberId,
    })
    .eq('id', expenseId);
  if (error) {
    throw error;
  }

  if (input.participantMemberIds || input.customSplits) {
    await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
    const existing = getExpenseById(expenseId);
    const participantIds =
      input.participantMemberIds ??
      getGroupMembers(existing?.groupId ?? '').map((member) => member.id);
    const amountCents = input.amountCents ?? existing?.amountCents ?? 0;
    const splitAmounts =
      input.customSplits ??
      buildEqualSplits(participantIds, amountCents).map((split) => ({
        memberId: split.memberId,
        shareAmountCents: split.shareAmountCents,
      }));
    await supabase.from('expense_splits').insert(
      splitAmounts.map((split) => ({
        expense_id: expenseId,
        member_id: split.memberId,
        share_amount_cents: split.shareAmountCents,
      })),
    );
  }

  const updated = getExpenseById(expenseId);
  if (!updated) {
    throw new Error(`Expense not found: ${expenseId}`);
  }
  return updated;
}

export async function deleteExpense(
  expenseId: string,
): Promise<{ expenseId: string; groupId?: string | null; type?: Expense['type'] }> {
  const existing = getExpenseById(expenseId);
  if (!existing || existing.deletedAt) {
    throw new Error(`Expense not found: ${expenseId}`);
  }
  if (!canDeleteExpense(expenseId)) {
    throw new Error('You do not have permission to delete this expense.');
  }

  logger.info('Delete expense started', {
    table: 'expenses',
    expenseId,
    groupId: existing.groupId,
    type: existing.type,
  });

  try {
    const { error } = await supabase
      .from('expenses')
      .update({ deleted_at: isoNow() })
      .eq('id', expenseId);
    if (error) {
      throw error;
    }
    logger.info('Delete expense succeeded', {
      table: 'expenses',
      expenseId,
      groupId: existing.groupId,
      type: existing.type,
    });
    return {
      expenseId,
      groupId: existing.groupId ?? null,
      type: existing.type,
    };
  } catch (error) {
    logger.error('Delete expense failed', error, {
      table: 'expenses',
      expenseId,
      groupId: existing.groupId,
      type: existing.type,
    });
    throw error;
  }
}

export function canDeleteExpense(expenseId: string, userId: string = getCurrentUserId()): boolean {
  const expense = getExpenseById(expenseId);
  if (!expense || expense.deletedAt) {
    return false;
  }
  if (expense.userId === userId) {
    return true;
  }
  if (expense.type === 'split' && expense.groupId) {
    const group = getGroupById(expense.groupId);
    return group?.ownerId === userId;
  }
  return false;
}
