import type { DatabaseSnapshot } from '../storage/types';
import { createEmptySnapshot, readCache, setCache } from './dataCache';
import { refreshAllCache } from './cacheRefresh';

export { readCache, setCache, mergeCache, createEmptySnapshot } from './dataCache';

/** @deprecated Prefer targeted slice refresh via AppDataContext.invalidate */
export async function refreshCache(): Promise<DatabaseSnapshot> {
  return refreshAllCache();
}

export function clearCache(): void {
  setCache(createEmptySnapshot());
}

export { readCache as getCacheSnapshot };
