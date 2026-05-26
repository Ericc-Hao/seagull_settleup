import { describe, expect, it } from 'vitest';

import { createEmptySnapshot, readCache, setCache } from '../dataCache';
import { versionsAfterLogoutReset } from '../../context/appDataInvalidation';
import { EMPTY_VERSIONS } from '../../context/appDataTypes';

describe('dataCache logout reset', () => {
  it('clears user-specific cache snapshot', () => {
    setCache({
      ...createEmptySnapshot(),
      expenses: [
        {
          id: 'expense-1',
          userId: 'user-1',
          type: 'personal',
          amountCents: 1000,
          currency: 'CAD',
          category: 'Food',
          description: 'Lunch',
          expenseDate: '2026-01-01',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(readCache().expenses).toHaveLength(1);

    setCache(createEmptySnapshot());

    expect(readCache().expenses).toHaveLength(0);
    expect(readCache().profiles).toHaveLength(0);
    expect(versionsAfterLogoutReset()).toEqual(EMPTY_VERSIONS);
  });
});
