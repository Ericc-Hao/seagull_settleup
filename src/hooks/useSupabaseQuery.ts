import { useCallback, useEffect, useMemo, useState } from 'react';

import { getErrorMessage } from '../utils/errors';
import { createLogger } from '../utils/logger';

export interface UseSupabaseQueryMeta {
  namespace: string;
  operation: string;
}

export function useSupabaseQuery<T>(
  query: () => Promise<T>,
  deps: unknown[] = [],
  meta?: UseSupabaseQueryMeta,
) {
  const logger = useMemo(
    () => (meta ? createLogger(meta.namespace) : null),
    [meta?.namespace],
  );
  const operation = meta?.operation ?? 'fetch';

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    logger?.info(`${operation} started`);
    try {
      const next = await query();
      setData(next);
      const count = Array.isArray(next) ? next.length : next ? 1 : 0;
      logger?.info(`${operation} succeeded`, {
        count: Array.isArray(next) ? count : undefined,
        hasData: Boolean(next),
      });
    } catch (err) {
      const message = getErrorMessage(err);
      logger?.error(`${operation} failed`, err);
      setError(message || 'Unable to load data.');
    } finally {
      setLoading(false);
    }
  }, [logger, operation, ...deps]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
