import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  retryRequest,
  calculateRetryDelay,
  isRetryableError,
  getErrorMessage,
  isOnline,
  waitForOnline,
} from '../../utils/apiRetry';
import type { AxiosError } from 'axios';

describe('calculateRetryDelay', () => {
  it('calculates exponential backoff correctly', () => {
    const baseDelay = 1000;

    const delay0 = calculateRetryDelay(0, baseDelay);
    const delay1 = calculateRetryDelay(1, baseDelay);
    const delay2 = calculateRetryDelay(2, baseDelay);

    // First retry should be around 1s (with jitter)
    expect(delay0).toBeGreaterThanOrEqual(700);
    expect(delay0).toBeLessThanOrEqual(1300);

    // Second retry should be around 2s (with jitter)
    expect(delay1).toBeGreaterThanOrEqual(1400);
    expect(delay1).toBeLessThanOrEqual(2600);

    // Third retry should be around 4s (with jitter)
    expect(delay2).toBeGreaterThanOrEqual(2800);
    expect(delay2).toBeLessThanOrEqual(5200);
  });

  it('caps delay at 30 seconds', () => {
    const delay = calculateRetryDelay(10, 1000); // Would be very large without cap
    expect(delay).toBeLessThanOrEqual(30000);
  });
});

describe('retryRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('succeeds on first attempt', async () => {
    const successFn = vi.fn().mockResolvedValue('success');

    const result = await retryRequest(successFn, {
      maxRetries: 3,
      retryDelay: 1000,
    });

    expect(result).toBe('success');
    expect(successFn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error', async () => {
    const error = {
      isAxiosError: true,
      response: { status: 500 },
    } as AxiosError;

    const failThenSucceed = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const promise = retryRequest(failThenSucceed, {
      maxRetries: 3,
      retryDelay: 100,
    });

    // Advance timers for retries
    await vi.advanceTimersByTimeAsync(500);

    const result = await promise;

    expect(result).toBe('success');
    expect(failThenSucceed).toHaveBeenCalledTimes(3);
  });

  it('stops retrying after max retries', async () => {
    const error = {
      isAxiosError: true,
      response: { status: 500 },
    } as AxiosError;

    const alwaysFails = vi.fn().mockRejectedValue(error);

    const promise = retryRequest(alwaysFails, {
      maxRetries: 2,
      retryDelay: 100,
    });

    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).rejects.toThrow();
    expect(alwaysFails).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('does not retry on non-retryable error', async () => {
    const error = {
      isAxiosError: true,
      response: { status: 400 }, // Client error - not retryable
    } as AxiosError;

    const failWith400 = vi.fn().mockRejectedValue(error);

    await expect(
      retryRequest(failWith400, {
        maxRetries: 3,
        retryDelay: 100,
      })
    ).rejects.toThrow();

    expect(failWith400).toHaveBeenCalledTimes(1); // No retries
  });

  it('calls onRetry callback', async () => {
    const error = {
      isAxiosError: true,
      response: { status: 503 },
    } as AxiosError;

    const failOnce = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('success');
    const onRetry = vi.fn();

    const promise = retryRequest(failOnce, {
      maxRetries: 3,
      retryDelay: 100,
      onRetry,
    });

    await vi.advanceTimersByTimeAsync(500);
    await promise;

    expect(onRetry).toHaveBeenCalledWith(1, error);
  });
});

describe('isRetryableError', () => {
  it('identifies network errors as retryable', () => {
    const networkError = {
      isAxiosError: true,
      response: undefined, // No response = network error
    } as AxiosError;

    expect(isRetryableError(networkError)).toBe(true);
  });

  it('identifies 5xx errors as retryable', () => {
    const serverError = {
      isAxiosError: true,
      response: { status: 500 },
    } as any;

    expect(isRetryableError(serverError)).toBe(true);
  });

  it('identifies 429 as retryable', () => {
    const rateLimitError = {
      isAxiosError: true,
      response: { status: 429 },
    } as any;

    expect(isRetryableError(rateLimitError)).toBe(true);
  });

  it('identifies 4xx errors (except 408, 429) as not retryable', () => {
    const clientError = {
      isAxiosError: true,
      response: { status: 400 },
    } as any;

    expect(isRetryableError(clientError)).toBe(false);
  });

  it('identifies 408 timeout as retryable', () => {
    const timeoutError = {
      isAxiosError: true,
      response: { status: 408 },
    } as any;

    expect(isRetryableError(timeoutError)).toBe(true);
  });
});

describe('getErrorMessage', () => {
  it('returns user-friendly message for network error', () => {
    const error = {
      isAxiosError: true,
      response: undefined,
      message: 'Network Error',
    } as AxiosError;

    const message = getErrorMessage(error);

    expect(message).toContain('Network error');
    expect(message).toContain('internet connection');
  });

  it('returns user-friendly message for 401', () => {
    const error = {
      isAxiosError: true,
      response: { status: 401, data: {} },
      message: '',
    } as any;

    const message = getErrorMessage(error);

    expect(message).toContain('not authorized');
    expect(message).toContain('log in');
  });

  it('returns user-friendly message for 404', () => {
    const error = {
      isAxiosError: true,
      response: { status: 404, data: {} },
      message: '',
    } as any;

    const message = getErrorMessage(error);

    expect(message).toContain('not found');
  });

  it('returns server message when available', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 500,
        data: { error: 'Custom server error message' },
      },
      message: '',
    } as any;

    const message = getErrorMessage(error);

    expect(message).toBe('Custom server error message');
  });

  it('handles non-Axios errors', () => {
    const error = new Error('Regular error');
    const message = getErrorMessage(error);

    expect(message).toBe('Regular error');
  });

  it('handles unknown errors', () => {
    const message = getErrorMessage(null);
    expect(message).toContain('unknown error');
  });
});

describe('isOnline', () => {
  it('returns navigator.onLine status', () => {
    // Mock online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    expect(isOnline()).toBe(true);

    // Mock offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    expect(isOnline()).toBe(false);
  });
});

describe('waitForOnline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves immediately if already online', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    await expect(waitForOnline()).resolves.toBeUndefined();
  });

  it('resolves when online event fires', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const promise = waitForOnline();

    // Simulate going online
    setTimeout(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
    }, 1000);

    vi.advanceTimersByTime(1000);

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects on timeout', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const promise = waitForOnline(1000);

    vi.advanceTimersByTime(1001);

    await expect(promise).rejects.toThrow('Network connection timeout');
  });
});
