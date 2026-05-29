import { buildEqualSplits } from '../../core/settlement';
import { mapExpense } from '../../lib/mappers';
import { supabase } from '../../lib/supabase';
import type {
  CreateExpenseInput,
  CreatePersonalExpenseInput,
  CreateSplitExpenseInput,
  ReceiptConversionMetadata,
  UpdateExpenseInput,
} from '../../types/inputs';
import type { Expense, Group } from '../../types/models';
import { createLogger } from '../../utils/logger';
import { getGroupMembers } from '../dbHelpers';
import { getGroupById } from '../groupService';
import { isActiveGroupStatus, INACTIVE_GROUP_EXPENSE_MESSAGE } from '../groupAccess';
import { createReceipt } from '../receiptService';
import { uploadReceiptImage } from '../storageService';
import { getExpenseById } from './expenseReadService';

const logger = createLogger('expenseService');

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
