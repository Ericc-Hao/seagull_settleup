import { vi } from 'vitest';

export type QueryResult = { data: unknown; error: unknown | null };

export interface ChainableQuery extends Record<string, unknown> {
  _insertPayload?: unknown;
  _updatePayload?: unknown;
}

export function createChainableQuery(result: QueryResult): ChainableQuery {
  const builder: ChainableQuery = {};

  const chain = vi.fn(() => builder);
  for (const method of ['select', 'eq', 'in', 'is', 'or', 'order', 'limit'] as const) {
    builder[method] = chain;
  }

  builder.insert = vi.fn((payload: unknown) => {
    builder._insertPayload = payload;
    return builder;
  });

  builder.update = vi.fn((payload: unknown) => {
    builder._updatePayload = payload;
    return builder;
  });

  builder.maybeSingle = vi.fn().mockResolvedValue(result);
  builder.single = vi.fn().mockResolvedValue(result);

  builder.then = (
    onFulfilled?: ((value: QueryResult) => unknown) | null,
    onRejected?: ((reason: unknown) => unknown) | null,
  ) => Promise.resolve(result).then(onFulfilled ?? undefined, onRejected ?? undefined);

  return builder;
}

export function createFromRouter(
  handlers: Record<string, () => ChainableQuery>,
  onMiss?: (table: string) => ChainableQuery,
): (table: string) => ChainableQuery {
  return (table: string) => {
    const handler = handlers[table] ?? onMiss;
    if (!handler) {
      throw new Error(`Unexpected supabase.from(${table})`);
    }
    return handler();
  };
}
