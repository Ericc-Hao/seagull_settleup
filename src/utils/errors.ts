type SupabaseLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

export function getErrorMessage(error: unknown): string {
  if (!error) {
    return 'Unknown error';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as SupabaseLikeError).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return String(error);
}

export function normalizeSupabaseError(error: unknown): { message: string; code?: string } {
  if (error instanceof Error) {
    return { message: error.message };
  }
  if (typeof error === 'object' && error !== null) {
    const supabaseError = error as SupabaseLikeError;
    return {
      message: supabaseError.message ?? 'Unknown Supabase error',
      code: supabaseError.code,
    };
  }
  return { message: String(error) };
}

export function toUserFriendlyError(error: unknown, fallback: string): string {
  if (!error) {
    return fallback;
  }

  const message = getErrorMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes('row-level security')) {
    return 'You do not have permission to perform this action. Please sign in again and retry.';
  }
  if (lower.includes('jwt') || lower.includes('not authenticated')) {
    return 'Your session expired. Please sign in again.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object') {
    const supabaseError = error as SupabaseLikeError;
    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  return fallback;
}
