import { supabase } from '../lib/supabase';
import { extensionForMimeType, readLocalFileForUpload } from '../utils/fileUpload';
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
  mimeTypeHint?: string,
): Promise<UploadedFileResult> {
  logger.info('Receipt upload started', { userId, expenseId, bucket: 'receipts' });
  try {
    const file = await readLocalFileForUpload(localUri, mimeTypeHint);
    const extension = extensionForMimeType(file.mimeType);
    const storagePath = `${userId}/${expenseId}/${Date.now()}.${extension}`;

    const { error } = await supabase.storage.from('receipts').upload(storagePath, file.arrayBuffer, {
      contentType: file.mimeType,
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from('receipts').getPublicUrl(storagePath);
    const result: UploadedFileResult = {
      storagePath,
      publicUrl: data.publicUrl || storagePath,
      mimeType: file.mimeType,
      fileSize: file.byteLength,
    };

    logger.info('Receipt upload succeeded', { userId, expenseId, bucket: 'receipts' });
    return result;
  } catch (error) {
    logger.error('Receipt upload failed', error, { userId, expenseId, bucket: 'receipts' });
    throw error;
  }
}
