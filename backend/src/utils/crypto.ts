import bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

export function generateFileChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function generateShareToken(): string {
  // URL-safe base64 token
  return randomBytes(48).toString('base64url');
}
