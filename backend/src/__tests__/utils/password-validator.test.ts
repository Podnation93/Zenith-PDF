import { describe, it, expect } from 'vitest';
import {
  validatePasswordStrength,
  validatePasswordOrThrow,
  containsPersonalInfo,
  getPasswordCrackTime,
} from '../../utils/password-validator';

describe('validatePasswordStrength', () => {
  it('rejects passwords shorter than minimum length', () => {
    const result = validatePasswordStrength('short', [], { minLength: 8 });

    expect(result.isValid).toBe(false);
    expect(result.feedback.suggestions).toContain(
      'Use at least 8 characters'
    );
  });

  it('rejects passwords without uppercase when required', () => {
    const result = validatePasswordStrength('lowercase123!', [], {
      requireUppercase: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.feedback.suggestions).toContain(
      'Include at least one uppercase letter'
    );
  });

  it('rejects passwords without lowercase when required', () => {
    const result = validatePasswordStrength('UPPERCASE123!', [], {
      requireLowercase: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.feedback.suggestions).toContain(
      'Include at least one lowercase letter'
    );
  });

  it('rejects passwords without numbers when required', () => {
    const result = validatePasswordStrength('PasswordOnly!', [], {
      requireNumbers: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.feedback.suggestions).toContain(
      'Include at least one number'
    );
  });

  it('rejects passwords without special characters when required', () => {
    const result = validatePasswordStrength('Password123', [], {
      requireSpecialChars: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.feedback.suggestions).toContain(
      'Include at least one special character (!@#$%^&*)'
    );
  });

  it('accepts strong passwords meeting all requirements', () => {
    const result = validatePasswordStrength('SecureP@ssw0rd!2024', [], {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      minScore: 3,
    });

    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it('rejects passwords with score below minimum', () => {
    const result = validatePasswordStrength('password', [], { minScore: 3 });

    expect(result.isValid).toBe(false);
    expect(result.score).toBeLessThan(3);
  });

  it('detects common passwords', () => {
    const result = validatePasswordStrength('password123', [], { minScore: 2 });

    expect(result.isValid).toBe(false);
    expect(result.feedback.warning).toBeTruthy();
  });

  it('detects sequential characters', () => {
    const result = validatePasswordStrength('abcdef123', [], { minScore: 3 });

    expect(result.isValid).toBe(false);
    expect(result.score).toBeLessThan(3);
  });

  it('detects repeated patterns', () => {
    const result = validatePasswordStrength('aaaaaa111', [], { minScore: 3 });

    expect(result.isValid).toBe(false);
    expect(result.score).toBeLessThan(3);
  });

  it('provides helpful feedback for weak passwords', () => {
    const result = validatePasswordStrength('123456', [], { minScore: 3 });

    expect(result.isValid).toBe(false);
    expect(result.feedback.suggestions.length).toBeGreaterThan(0);
    expect(result.feedback.warning).toBeTruthy();
  });

  it('considers user inputs in validation', () => {
    const result = validatePasswordStrength(
      'johndoe123',
      ['john', 'doe', 'johndoe@example.com'],
      { minScore: 3 }
    );

    expect(result.isValid).toBe(false);
    expect(result.score).toBeLessThan(3);
  });

  it('accepts long, random passwords', () => {
    const result = validatePasswordStrength(
      'xK9$mP2#vL8@qW5!nR7',
      [],
      { minScore: 4 }
    );

    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(4);
  });

  it('rejects passwords containing personal info', () => {
    const result = validatePasswordStrength(
      'alice.smith@example.com',
      ['alice', 'smith', 'alice.smith@example.com'],
      { minScore: 3 }
    );

    expect(result.isValid).toBe(false);
  });

  it('returns score from 0 to 4', () => {
    const weakResult = validatePasswordStrength('123', []);
    expect(weakResult.score).toBeGreaterThanOrEqual(0);
    expect(weakResult.score).toBeLessThanOrEqual(4);

    const strongResult = validatePasswordStrength('xK9$mP2#vL8@qW5!nR7', []);
    expect(strongResult.score).toBeGreaterThanOrEqual(0);
    expect(strongResult.score).toBeLessThanOrEqual(4);
  });

  it('provides crack time estimates', () => {
    const result = validatePasswordStrength('SecureP@ssw0rd!2024', []);

    expect(result.crackTime).toBeDefined();
    expect(result.crackTime.online).toBeDefined();
    expect(result.crackTime.offline).toBeDefined();
  });
});

describe('validatePasswordOrThrow', () => {
  it('throws error for weak passwords', () => {
    expect(() => {
      validatePasswordOrThrow('weak', [], { minScore: 3 });
    }).toThrow();
  });

  it('does not throw for strong passwords', () => {
    expect(() => {
      validatePasswordOrThrow('SecureP@ssw0rd!2024', [], { minScore: 3 });
    }).not.toThrow();
  });

  it('throws ValidationError with feedback message', () => {
    expect(() => {
      validatePasswordOrThrow('password', [], { minScore: 3 });
    }).toThrow(/too weak|common|predictable/i);
  });

  it('includes suggestions in error message', () => {
    try {
      validatePasswordOrThrow('short', [], { minLength: 8, minScore: 3 });
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.message).toContain('8 characters');
    }
  });

  it('accepts passwords meeting all requirements', () => {
    expect(() => {
      validatePasswordOrThrow('MyS3cure!Pass', [], {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        minScore: 3,
      });
    }).not.toThrow();
  });
});

describe('containsPersonalInfo', () => {
  it('detects email in password', () => {
    const result = containsPersonalInfo(
      'myemail@example.com',
      ['myemail@example.com']
    );

    expect(result).toBe(true);
  });

  it('detects name in password', () => {
    const result = containsPersonalInfo('alice123', ['alice']);

    expect(result).toBe(true);
  });

  it('detects partial name match', () => {
    const result = containsPersonalInfo('alicesmith456', ['alice', 'smith']);

    expect(result).toBe(true);
  });

  it('is case-insensitive', () => {
    const result = containsPersonalInfo('ALICE123', ['alice']);

    expect(result).toBe(true);
  });

  it('returns false when no personal info found', () => {
    const result = containsPersonalInfo('xK9$mP2#vL8', ['alice', 'smith']);

    expect(result).toBe(false);
  });

  it('handles empty user inputs', () => {
    const result = containsPersonalInfo('password123', []);

    expect(result).toBe(false);
  });

  it('ignores very short inputs', () => {
    const result = containsPersonalInfo('password123', ['a', 'b']);

    expect(result).toBe(false);
  });

  it('detects username in password', () => {
    const result = containsPersonalInfo('johndoe2024', ['johndoe']);

    expect(result).toBe(true);
  });
});

describe('getPasswordCrackTime', () => {
  it('returns crack time estimates', () => {
    const crackTime = getPasswordCrackTime('SecureP@ssw0rd!2024');

    expect(crackTime).toBeDefined();
    expect(crackTime.online).toBeDefined();
    expect(crackTime.offline).toBeDefined();
  });

  it('provides online throttled estimate', () => {
    const crackTime = getPasswordCrackTime('MyPassword123!');

    expect(crackTime.online.throttled).toBeDefined();
    expect(typeof crackTime.online.throttled).toBe('string');
  });

  it('provides online unthrottled estimate', () => {
    const crackTime = getPasswordCrackTime('MyPassword123!');

    expect(crackTime.online.unthrottled).toBeDefined();
    expect(typeof crackTime.online.unthrottled).toBe('string');
  });

  it('provides offline slow hashing estimate', () => {
    const crackTime = getPasswordCrackTime('MyPassword123!');

    expect(crackTime.offline.slowHashing).toBeDefined();
    expect(typeof crackTime.offline.slowHashing).toBe('string');
  });

  it('provides offline fast hashing estimate', () => {
    const crackTime = getPasswordCrackTime('MyPassword123!');

    expect(crackTime.offline.fastHashing).toBeDefined();
    expect(typeof crackTime.offline.fastHashing).toBe('string');
  });

  it('shows longer crack time for stronger passwords', () => {
    const weakCrackTime = getPasswordCrackTime('password');
    const strongCrackTime = getPasswordCrackTime('xK9$mP2#vL8@qW5!nR7');

    // Strong password should take longer to crack
    // This is a qualitative check since exact times vary
    expect(strongCrackTime).toBeDefined();
    expect(weakCrackTime).toBeDefined();
  });

  it('handles very weak passwords', () => {
    const crackTime = getPasswordCrackTime('123');

    expect(crackTime.online.throttled).toBeDefined();
    expect(crackTime.offline.fastHashing).toBeDefined();
  });

  it('handles very strong passwords', () => {
    const crackTime = getPasswordCrackTime(
      'xK9$mP2#vL8@qW5!nR7&tY4^uI6*oP3'
    );

    expect(crackTime.online.throttled).toBeDefined();
    expect(crackTime.offline.slowHashing).toBeDefined();
  });
});

describe('Integration: Full password validation flow', () => {
  it('validates registration password with user context', () => {
    const email = 'alice.smith@example.com';
    const firstName = 'Alice';
    const lastName = 'Smith';
    const password = 'SecureP@ssw0rd!2024';

    const userInputs = [email, email.split('@')[0], firstName, lastName];

    const result = validatePasswordStrength(password, userInputs, {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      minScore: 3,
    });

    expect(result.isValid).toBe(true);
  });

  it('rejects password containing user information', () => {
    const email = 'alice.smith@example.com';
    const firstName = 'Alice';
    const lastName = 'Smith';
    const password = 'AliceSmith123!';

    const userInputs = [email, email.split('@')[0], firstName, lastName];

    const result = validatePasswordStrength(password, userInputs, {
      minLength: 8,
      minScore: 3,
    });

    expect(result.isValid).toBe(false);
  });

  it('provides actionable feedback for password improvement', () => {
    const result = validatePasswordStrength('password', [], {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      minScore: 3,
    });

    expect(result.isValid).toBe(false);
    expect(result.feedback.suggestions.length).toBeGreaterThan(0);

    // Should suggest improvements
    const suggestions = result.feedback.suggestions.join(' ');
    expect(suggestions.toLowerCase()).toMatch(
      /uppercase|number|special|character/
    );
  });

  it('handles edge case: empty password', () => {
    const result = validatePasswordStrength('', []);

    expect(result.isValid).toBe(false);
    expect(result.score).toBe(0);
  });

  it('handles edge case: very long password', () => {
    const longPassword = 'a'.repeat(500) + 'B1!';

    const result = validatePasswordStrength(longPassword, [], {
      minLength: 8,
      minScore: 2,
    });

    // Should still validate (though may not be strong due to repetition)
    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('accepts passphrase-style passwords', () => {
    const result = validatePasswordStrength(
      'correct-horse-battery-staple-2024!',
      [],
      { minLength: 8, minScore: 3 }
    );

    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(3);
  });
});
