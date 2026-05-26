import { afterEach, describe, expect, it, vi } from 'vitest';

import { debounce } from '../debounce';

describe('debounce', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('batches multiple calls within the wait window into one execution', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 250);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
