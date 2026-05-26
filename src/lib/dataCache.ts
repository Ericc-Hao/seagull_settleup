import type { DatabaseSnapshot } from '../storage/types';

export function createEmptySnapshot(): DatabaseSnapshot {
  return {
    users: [],
    profiles: [],
    groups: [],
    groupMembers: [],
    groupInvitations: [],
    teams: [],
    teamMembers: [],
    expenses: [],
    expenseSplits: [],
    settlements: [],
    receipts: [],
    categories: [],
  };
}

let cache: DatabaseSnapshot = createEmptySnapshot();

export function readCache(): DatabaseSnapshot {
  return cache;
}

export function setCache(snapshot: DatabaseSnapshot): void {
  cache = snapshot;
}

export function mergeCache(patch: Partial<DatabaseSnapshot>): void {
  cache = { ...cache, ...patch };
}
