/** Read a local file URI into an ArrayBuffer for Supabase Storage uploads. */

function guessMimeTypeFromUri(uri: string): string | undefined {
  const lower = uri.split('?')[0]?.toLowerCase() ?? '';
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) {
    return 'image/heic';
  }
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  return undefined;
}

export interface LocalFileUploadPayload {
  arrayBuffer: ArrayBuffer;
  mimeType: string;
  byteLength: number;
}

export async function readLocalFileForUpload(
  localUri: string,
  mimeTypeHint?: string,
): Promise<LocalFileUploadPayload> {
  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error(`Could not read file (${response.status}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const mimeType =
    mimeTypeHint?.trim() ||
    response.headers.get('Content-Type')?.split(';')[0]?.trim() ||
    guessMimeTypeFromUri(localUri) ||
    'application/octet-stream';

  return {
    arrayBuffer,
    mimeType,
    byteLength: arrayBuffer.byteLength,
  };
}

export function extensionForMimeType(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
    case 'image/heif':
      return 'heic';
    default:
      return 'jpg';
  }
}
