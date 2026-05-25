import { supabase } from '../lib/supabase';
import { createLogger } from '../utils/logger';

const logger = createLogger('storageService');

export interface UploadedFileResult {
  storagePath: string;
  publicUrl: string;
  mimeType: string;
  fileSize?: number;
}

export async function uploadReceiptImage(
  userId: string,
  expenseId: string,
  localUri: string,
): Promise<UploadedFileResult> {
  logger.info('Receipt upload started', { userId, expenseId, bucket: 'receipts' });
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';
    const extension = mimeType.includes('png') ? 'png' : 'jpg';
    const storagePath = `${userId}/${expenseId}/${Date.now()}.${extension}`;

    const { error } = await supabase.storage.from('receipts').upload(storagePath, blob, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from('receipts').getPublicUrl(storagePath);
    const result: UploadedFileResult = {
      storagePath,
      publicUrl: data.publicUrl || storagePath,
      mimeType,
      fileSize: blob.size,
    };

    logger.info('Receipt upload succeeded', { userId, expenseId, bucket: 'receipts' });
    return result;
  } catch (error) {
    logger.error('Receipt upload failed', error, { userId, expenseId, bucket: 'receipts' });
    throw error;
  }
}
