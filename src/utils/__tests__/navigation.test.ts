import { beforeEach, describe, expect, it, vi } from 'vitest';

const back = vi.fn();
const replace = vi.fn();
const canGoBack = vi.fn();

vi.mock('expo-router', () => ({
  router: {
    back,
    replace,
    canGoBack,
    push: vi.fn(),
    dismissAll: vi.fn(),
    navigate: vi.fn(),
  },
}));

describe('navigation helpers', () => {
  beforeEach(() => {
    back.mockReset();
    replace.mockReset();
    canGoBack.mockReset();
  });

  it('safeBackOrReplace goes back when stack allows', async () => {
    canGoBack.mockReturnValue(true);
    const { safeBackOrReplace } = await import('../navigation');
    safeBackOrReplace('/(tabs)/home');
    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('safeBackOrReplace replaces when stack is empty', async () => {
    canGoBack.mockReturnValue(false);
    const { safeBackOrReplace } = await import('../navigation');
    safeBackOrReplace('/(tabs)/expenses');
    expect(replace).toHaveBeenCalledWith('/(tabs)/expenses');
    expect(back).not.toHaveBeenCalled();
  });

  it('navigateAfterDeleteExpense prefers back for group context', async () => {
    canGoBack.mockReturnValue(true);
    const { navigateAfterDeleteExpense } = await import('../navigation');
    navigateAfterDeleteExpense(
      { type: 'split', groupId: 'group-1' },
      { from: 'group', groupId: 'group-1' },
    );
    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('navigateAfterDeleteExpense falls back to expenses list for personal context', async () => {
    canGoBack.mockReturnValue(false);
    const { navigateAfterDeleteExpense } = await import('../navigation');
    navigateAfterDeleteExpense(
      { type: 'personal' },
      { from: 'expenses' },
    );
    expect(replace).toHaveBeenCalledWith('/(tabs)/expenses');
  });
});
