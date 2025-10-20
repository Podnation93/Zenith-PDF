import zxcvbn from 'zxcvbn';

/**
 * Security utilities for Zenith PDF Desktop
 * Implements password strength validation and rate limiting
 */

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-4, with 4 being strongest
  feedback: {
    warning?: string;
    suggestions: string[];
  };
  requiredScore: number;
}

/**
 * Validates password strength using zxcvbn
 * Requires minimum score of 3 for strong passwords
 */
export function validatePasswordStrength(
  password: string,
  userInputs: string[] = []
): PasswordValidationResult {
  const MIN_SCORE = 3; // Require strong passwords (0=weak, 4=strong)
  const MIN_LENGTH = 8;

  // Check minimum length first
  if (password.length < MIN_LENGTH) {
    return {
      isValid: false,
      score: 0,
      feedback: {
        warning: 'Password is too short',
        suggestions: [`Use at least ${MIN_LENGTH} characters`],
      },
      requiredScore: MIN_SCORE,
    };
  }

  // Use zxcvbn to evaluate password strength
  const result = zxcvbn(password, userInputs);

  return {
    isValid: result.score >= MIN_SCORE,
    score: result.score,
    feedback: {
      warning: result.feedback.warning || undefined,
      suggestions: result.feedback.suggestions || [],
    },
    requiredScore: MIN_SCORE,
  };
}

/**
 * Rate limiter for local desktop app
 * Prevents brute force attacks on authentication
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMinutes: number = 15) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMinutes * 60 * 1000;

    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if an action is rate limited
   * @param key - Unique identifier (e.g., email address)
   * @returns true if rate limited, false otherwise
   */
  isRateLimited(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      return false;
    }

    // Reset if window expired
    if (now >= record.resetAt) {
      this.attempts.delete(key);
      return false;
    }

    return record.count >= this.maxAttempts;
  }

  /**
   * Record an attempt
   * @param key - Unique identifier
   */
  recordAttempt(key: string): void {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now >= record.resetAt) {
      this.attempts.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
    } else {
      record.count++;
    }
  }

  /**
   * Get remaining attempts before rate limit
   * @param key - Unique identifier
   */
  getRemainingAttempts(key: string): number {
    const record = this.attempts.get(key);
    if (!record || Date.now() >= record.resetAt) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - record.count);
  }

  /**
   * Get time until reset in milliseconds
   */
  getResetTime(key: string): number | null {
    const record = this.attempts.get(key);
    if (!record) {
      return null;
    }
    const now = Date.now();
    return record.resetAt > now ? record.resetAt - now : null;
  }

  /**
   * Clear attempts for a key (e.g., after successful login)
   */
  clear(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (now >= record.resetAt) {
        this.attempts.delete(key);
      }
    }
  }
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize email input
   */
  static sanitizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize file name to prevent path traversal
   */
  static sanitizeFileName(fileName: string): string {
    // Remove path separators and null bytes
    return fileName.replace(/[/\\:\0]/g, '_').trim();
  }

  /**
   * Validate PDF file extension
   */
  static isPdfFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.pdf');
  }
}

/**
 * Secure token generation for share links
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(length);

  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[randomBytes[i] % chars.length];
  }

  return token;
}
