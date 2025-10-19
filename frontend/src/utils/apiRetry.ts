import type { AxiosError, AxiosRequestConfig } from 'axios';

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
  onRetry?: (retryCount: number, error: AxiosError) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryCondition: (error: AxiosError) => {
    // Retry on network errors or 5xx server errors
    if (!error.response) {
      // Network error (no response from server)
      return true;
    }

    const status = error.response.status;
    // Retry on server errors (5xx) or rate limit (429)
    return status >= 500 || status === 429;
  },
};

/**
 * Calculate exponential backoff delay
 * @param retryCount - Current retry attempt (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @returns Delay in milliseconds with jitter
 */
export function calculateRetryDelay(retryCount: number, baseDelay: number): number {
  // Exponential backoff: baseDelay * 2^retryCount
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);

  // Add jitter (random variation) to prevent thundering herd problem
  const jitter = Math.random() * 0.3 * exponentialDelay; // +/- 30% jitter

  return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
}

/**
 * Delay execution for a specified time
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry axios request with exponential backoff
 * @param requestFn - Function that returns a Promise (axios request)
 * @param config - Retry configuration
 * @returns Promise that resolves with the request result
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: AxiosError | Error;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // Try the request
      return await requestFn();
    } catch (error) {
      lastError = error as AxiosError;

      // Check if we should retry
      const isAxiosError = (error as AxiosError).isAxiosError;
      const shouldRetry =
        attempt < retryConfig.maxRetries &&
        isAxiosError &&
        retryConfig.retryCondition!(error as AxiosError);

      if (!shouldRetry) {
        // Don't retry, throw the error
        throw error;
      }

      // Call onRetry callback if provided
      retryConfig.onRetry?.(attempt + 1, error as AxiosError);

      // Calculate delay with exponential backoff
      const delayMs = calculateRetryDelay(attempt, retryConfig.retryDelay);

      // Log retry attempt in development
      if (import.meta.env.DEV) {
        console.warn(
          `Request failed, retrying (${attempt + 1}/${retryConfig.maxRetries}) after ${Math.round(delayMs)}ms...`,
          error
        );
      }

      // Wait before retrying
      await delay(delayMs);
    }
  }

  // All retries exhausted, throw last error
  throw lastError!;
}

/**
 * Determine if an error is retryable
 * @param error - Axios error
 * @returns boolean
 */
export function isRetryableError(error: AxiosError): boolean {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  const status = error.response.status;

  // Retryable HTTP status codes
  const retryableStatuses = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ];

  return retryableStatuses.includes(status);
}

/**
 * Get user-friendly error message from axios error
 * @param error - Axios error or regular error
 * @returns User-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unknown error occurred';
  }

  // Axios error
  if ((error as AxiosError).isAxiosError) {
    const axiosError = error as AxiosError;

    // Network error (no response)
    if (!axiosError.response) {
      return 'Network error. Please check your internet connection and try again.';
    }

    // Server returned error response
    const status = axiosError.response.status;
    const data = axiosError.response.data as any;

    // Try to get error message from response
    const serverMessage =
      data?.error || data?.message || data?.details || axiosError.message;

    // Map common HTTP status codes to user-friendly messages
    switch (status) {
      case 400:
        return serverMessage || 'Invalid request. Please check your input.';
      case 401:
        return 'You are not authorized. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 408:
        return 'Request timeout. Please try again.';
      case 409:
        return serverMessage || 'A conflict occurred. Please refresh and try again.';
      case 413:
        return 'The file is too large. Please upload a smaller file.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Bad gateway. The server is temporarily unavailable.';
      case 503:
        return 'Service unavailable. Please try again later.';
      case 504:
        return 'Gateway timeout. Please try again.';
      default:
        return serverMessage || `An error occurred (${status})`;
    }
  }

  // Regular JavaScript error
  if (error instanceof Error) {
    return error.message;
  }

  // Unknown error type
  return String(error);
}

/**
 * Check if user is online
 * @returns boolean
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Wait for network connection to be restored
 * @param timeout - Maximum time to wait in milliseconds (default: 30 seconds)
 * @returns Promise that resolves when online or rejects on timeout
 */
export function waitForOnline(timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isOnline()) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', handleOnline);
      reject(new Error('Network connection timeout'));
    }, timeout);

    const handleOnline = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
      resolve();
    };

    window.addEventListener('online', handleOnline);
  });
}
