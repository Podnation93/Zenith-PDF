import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/crypto.js';
import {
  UnauthorizedError,
  ConflictError,
  ValidationError,
} from '../utils/errors.js';
import type { User, LoginRequest, RegisterRequest } from '../types/index.js';

export class AuthService {
  async register(data: RegisterRequest): Promise<User> {
    const { email, password, firstName, lastName } = data;

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (id, email, hashed_password, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, avatar_url, email_verified, created_at, updated_at, last_login_at`,
      [uuidv4(), email.toLowerCase(), hashedPassword, firstName || null, lastName || null]
    );

    return this.mapUserFromDb(result.rows[0]);
  }

  async login(data: LoginRequest): Promise<User> {
    const { email, password } = data;

    // Find user
    const result = await pool.query(
      `SELECT id, email, hashed_password, first_name, last_name, avatar_url, email_verified, created_at, updated_at, last_login_at
       FROM users
       WHERE email = $1 AND deleted_at IS NULL`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.hashed_password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    return this.mapUserFromDb(user);
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, avatar_url, email_verified, created_at, updated_at, last_login_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapUserFromDb(result.rows[0]);
  }

  async updateUser(
    userId: string,
    updates: Partial<Pick<User, 'firstName' | 'lastName' | 'avatarUrl'>>
  ): Promise<User> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCounter = 1;

    if (updates.firstName !== undefined) {
      fields.push(`first_name = $${paramCounter++}`);
      values.push(updates.firstName);
    }

    if (updates.lastName !== undefined) {
      fields.push(`last_name = $${paramCounter++}`);
      values.push(updates.lastName);
    }

    if (updates.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${paramCounter++}`);
      values.push(updates.avatarUrl);
    }

    if (fields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE id = $${paramCounter} AND deleted_at IS NULL
       RETURNING id, email, first_name, last_name, avatar_url, email_verified, created_at, updated_at, last_login_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    return this.mapUserFromDb(result.rows[0]);
  }

  private mapUserFromDb(row: any): User {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      avatarUrl: row.avatar_url,
      emailVerified: row.email_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
    };
  }
}

export const authService = new AuthService();
