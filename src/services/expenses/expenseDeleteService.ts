import { supabase } from '../../lib/supabase';
import type { Expense } from '../../types/models';
import { isoNow } from '../../utils/date';
import { createLogger } from '../../utils/logger';
import { getCurrentUserId, getGroupById } from '../groupService';
import { getExpenseById } from './expenseReadService';

const logger = createLogger('expenseService');

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
