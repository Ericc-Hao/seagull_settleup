import { mapReceipt } from '../lib/mappers';
import { refreshCache } from '../lib/supabaseSnapshot';
import { supabase } from '../lib/supabase';
import type { Receipt } from '../types/models';
import { createLogger } from '../utils/logger';
import { readDb } from './dbHelpers';
import { getCurrentUserId } from './groupService';

const logger = createLogger('receiptService');

export function getCachedReceipts(): Receipt[] {
  return readDb().receipts;
}

export async function getReceipts(): Promise<Receipt[]> {
  logger.info('Fetch receipts started', { table: 'receipts' });
  try {
    const { data, error } = await supabase.from('receipts').select('*').order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    const receipts = (data ?? []).map(mapReceipt);
    logger.info('Fetch receipts succeeded', { table: 'receipts', count: receipts.length });
    return receipts;
  } catch (error) {
    logger.error('Fetch receipts failed', error, { table: 'receipts' });
    throw error;
  }
}

export async function createReceipt(input: {
  storagePath: string;
  expenseId?: string;
  groupId?: string;
  publicUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}): Promise<Receipt> {
  logger.info('Create receipt started', { table: 'receipts', groupId: input.groupId, expenseId: input.expenseId });
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error('You must be logged in to upload a receipt.');
    }

    const { data, error } = await supabase
      .from('receipts')
      .insert({
        user_id: userId,
        expense_id: input.expenseId ?? null,
        group_id: input.groupId ?? null,
        storage_path: input.storagePath,
        public_url: input.publicUrl ?? null,
        file_name: input.fileName ?? null,
        mime_type: input.mimeType ?? null,
        file_size: input.fileSize ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }
    await refreshCache();
    logger.info('Create receipt succeeded', { table: 'receipts', receiptId: data.id });
    return mapReceipt(data);
  } catch (error) {
    logger.error('Create receipt failed', error, { table: 'receipts', groupId: input.groupId });
    throw error;
  }
}

export async function deleteReceipt(receiptId: string): Promise<void> {
  logger.info('Delete receipt started', { table: 'receipts', receiptId });
  try {
    const { error } = await supabase.from('receipts').delete().eq('id', receiptId);
    if (error) {
      throw error;
    }
    await refreshCache();
    logger.info('Delete receipt succeeded', { table: 'receipts', receiptId });
  } catch (error) {
    logger.error('Delete receipt failed', error, { table: 'receipts', receiptId });
    throw error;
  }
}
