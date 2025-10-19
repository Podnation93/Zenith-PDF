import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../utils/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Verify JWT token
    await request.jwtVerify();

    // Extract user ID from token
    const payload = request.user as { sub: string };
    if (!payload?.sub) {
      throw new UnauthorizedError('Invalid token payload');
    }

    // Attach user ID to request
    request.userId = payload.sub;
  } catch (error) {
    throw new UnauthorizedError('Authentication required');
  }
}

export async function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
    const payload = request.user as { sub: string };
    if (payload?.sub) {
      request.userId = payload.sub;
    }
  } catch {
    // Optional auth - ignore errors
  }
}
