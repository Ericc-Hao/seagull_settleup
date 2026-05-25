import { mapReceipt } from '../lib/mappers';
import { refreshCache } from '../lib/supabaseSnapshot';
import { supabase } from '../lib/supabase';
import type { Receipt } from '../types/models';
import type { ExpenseReceiptView } from '../types/views';
import { createLogger } from '../utils/logger';
import { readDb } from './dbHelpers';
import { getCurrentUserId } from './groupService';

const logger = createLogger('receiptService');

const RECEIPTS_BUCKET = 'receipts';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function findCachedReceipt(expenseId: string, expenseReceiptId?: string | null): Receipt | null {
  const db = readDb();
  if (expenseReceiptId) {
    const byId = db.receipts.find((receipt) => receipt.id === expenseReceiptId);
    if (byId) {
      return byId;
    }
  }
  return db.receipts.find((receipt) => receipt.expenseId === expenseId) ?? null;
}

function resolveReceiptDisplayUrlSync(receipt: Receipt): string | null {
  const publicUrl = receipt.publicUrl?.trim();
  if (publicUrl) {
    return publicUrl;
  }

  const storagePath = receipt.storagePath?.trim();
  if (!storagePath) {
    return null;
  }

  const { data } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl || null;
}

export function toExpenseReceiptView(receipt: Receipt, displayUrl?: string | null): ExpenseReceiptView {
  return {
    id: receipt.id,
    expenseId: receipt.expenseId,
    storagePath: receipt.storagePath,
    publicUrl: receipt.publicUrl,
    displayUrl: displayUrl ?? resolveReceiptDisplayUrlSync(receipt),
    fileName: receipt.fileName,
    mimeType: receipt.mimeType,
    fileSize: receipt.fileSize,
    ocrStatus: receipt.ocrStatus,
    ocrText: receipt.ocrText,
  };
}

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

export async function getReceiptForExpense(
  expenseId: string,
  expenseReceiptId?: string | null,
): Promise<Receipt | null> {
  logger.info('Receipt fetch started', { expenseId, table: 'receipts' });

  const cached = findCachedReceipt(expenseId, expenseReceiptId);
  if (cached) {
    logger.info('Receipt fetch succeeded', { expenseId, receiptId: cached.id, source: 'cache' });
    return cached;
  }

  try {
    if (expenseReceiptId) {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', expenseReceiptId)
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (data) {
        const receipt = mapReceipt(data);
        logger.info('Receipt fetch succeeded', { expenseId, receiptId: receipt.id, source: 'supabase_id' });
        return receipt;
      }
    }

    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      logger.info('No receipt found', { expenseId, table: 'receipts' });
      return null;
    }

    const receipt = mapReceipt(data);
    logger.info('Receipt fetch succeeded', { expenseId, receiptId: receipt.id, source: 'supabase_expense_id' });
    return receipt;
  } catch (error) {
    logger.error('Receipt fetch failed', error, { expenseId, table: 'receipts' });
    throw error;
  }
}

export async function getReceiptDisplayUrl(receipt: Receipt): Promise<string | null> {
  logger.info('Receipt URL resolution started', { receiptId: receipt.id, table: 'receipts' });

  const syncUrl = resolveReceiptDisplayUrlSync(receipt);
  if (syncUrl) {
    logger.info('Receipt URL resolved', {
      receiptId: receipt.id,
      source: receipt.publicUrl?.trim() ? 'public_url' : 'storage_public_url',
    });
    return syncUrl;
  }

  const storagePath = receipt.storagePath?.trim();
  if (!storagePath) {
    logger.info('No receipt URL found', { receiptId: receipt.id, table: 'receipts' });
    return null;
  }

  try {
    const { data: signed, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (error) {
      throw error;
    }

    logger.info('Receipt URL resolved', { receiptId: receipt.id, source: 'signed_url' });
    return signed.signedUrl;
  } catch (error) {
    logger.error('Receipt URL resolution failed', error, { receiptId: receipt.id, table: 'receipts' });
    return null;
  }
}

export async function getExpenseReceiptView(
  expenseId: string,
  expenseReceiptId?: string | null,
): Promise<ExpenseReceiptView | null> {
  const receipt = await getReceiptForExpense(expenseId, expenseReceiptId);
  if (!receipt) {
    return null;
  }

  const displayUrl = await getReceiptDisplayUrl(receipt);
  return toExpenseReceiptView(receipt, displayUrl);
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
