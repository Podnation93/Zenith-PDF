import zxcvbn from 'zxcvbn';
import { ValidationError } from './errors.js';

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-4 (zxcvbn score)
  feedback: {
    warning?: string;
    suggestions: string[];
  };
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minScore: number; // 0-4 (zxcvbn score: 0=too guessable, 4=very unguessable)
}

const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minScore: 3, // Strong password (3 or 4 recommended for production)
};

/**
 * Validates password strength using zxcvbn and custom requirements
 * @param password - The password to validate
 * @param userInputs - Additional user inputs to check against (email, name, etc.)
 * @param requirements - Custom password requirements (optional)
 * @returns PasswordValidationResult
 */
export function validatePasswordStrength(
  password: string,
  userInputs: string[] = [],
  requirements: Partial<PasswordRequirements> = {}
): PasswordValidationResult {
  const config = { ...DEFAULT_REQUIREMENTS, ...requirements };
  const errors: string[] = [];

  // Basic length check
  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters long`);
  }

  // Character type requirements
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (config.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common weak passwords
  const commonWeakPasswords = [
    'password', '12345678', 'password123', 'admin123', 'qwerty123',
    'letmein', 'welcome', 'monkey', '1q2w3e4r', 'abc123', 'password1',
  ];

  if (commonWeakPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common and easily guessable');
  }

  // Use zxcvbn for advanced strength analysis
  const result = zxcvbn(password, userInputs);

  // Check minimum score requirement
  if (result.score < config.minScore) {
    const scoreDescriptions = [
      'too weak',
      'weak',
      'moderate',
      'strong',
      'very strong',
    ];
    errors.push(
      `Password strength is ${scoreDescriptions[result.score]}, but ${scoreDescriptions[config.minScore]} or better is required`
    );
  }

  // Combine basic validation errors with zxcvbn feedback
  const allSuggestions = [
    ...errors,
    ...(result.feedback.suggestions || []),
  ];

  return {
    isValid: errors.length === 0 && result.score >= config.minScore,
    score: result.score,
    feedback: {
      warning: result.feedback.warning || errors[0],
      suggestions: allSuggestions,
    },
  };
}

/**
 * Validates and throws an error if password is weak
 * @param password - The password to validate
 * @param userInputs - Additional user inputs to check against (email, name, etc.)
 * @param requirements - Custom password requirements (optional)
 * @throws ValidationError if password is weak
 */
export function validatePasswordOrThrow(
  password: string,
  userInputs: string[] = [],
  requirements: Partial<PasswordRequirements> = {}
): void {
  const validation = validatePasswordStrength(password, userInputs, requirements);

  if (!validation.isValid) {
    const errorMessage = [
      validation.feedback.warning,
      ...validation.feedback.suggestions.slice(0, 3), // Limit to top 3 suggestions
    ]
      .filter(Boolean)
      .join('. ');

    throw new ValidationError(errorMessage || 'Password is too weak');
  }
}

/**
 * Generates a human-readable password strength label
 * @param score - zxcvbn score (0-4)
 * @returns string label
 */
export function getPasswordStrengthLabel(score: number): string {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return labels[score] || 'Unknown';
}

/**
 * Checks if password contains personal information
 * @param password - The password to check
 * @param personalInfo - Array of personal information (email, name, username, etc.)
 * @returns boolean
 */
export function containsPersonalInfo(
  password: string,
  personalInfo: string[]
): boolean {
  const lowercasePassword = password.toLowerCase();

  return personalInfo.some((info) => {
    if (!info || info.length < 3) return false;
    const lowercaseInfo = info.toLowerCase();

    // Check for exact matches and substrings
    return (
      lowercasePassword.includes(lowercaseInfo) ||
      lowercaseInfo.includes(lowercasePassword)
    );
  });
}

/**
 * Get time to crack estimates from zxcvbn
 * @param password - The password to analyze
 * @returns Object with crack time estimates
 */
export function getPasswordCrackTime(password: string): {
  onlineThrottling: string;
  onlineNoThrottling: string;
  offlineSlowHashing: string;
  offlineFastHashing: string;
} {
  const result = zxcvbn(password);
  const times = result.crack_times_display;

  return {
    onlineThrottling: times.online_throttling_100_per_hour,
    onlineNoThrottling: times.online_no_throttling_10_per_second,
    offlineSlowHashing: times.offline_slow_hashing_1e4_per_second,
    offlineFastHashing: times.offline_fast_hashing_1e10_per_second,
  };
}
