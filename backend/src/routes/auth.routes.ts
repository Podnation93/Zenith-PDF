import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const user = await authService.register(body);

    const accessToken = fastify.jwt.sign(
      { sub: user.id },
      { expiresIn: '7d' }
    );

    const refreshToken = fastify.jwt.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '30d' }
    );

    return reply.code(201).send({
      user,
      accessToken,
      refreshToken,
    });
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await authService.login(body);

    const accessToken = fastify.jwt.sign(
      { sub: user.id },
      { expiresIn: '7d' }
    );

    const refreshToken = fastify.jwt.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '30d' }
    );

    return reply.send({
      user,
      accessToken,
      refreshToken,
    });
  });

  // Get current user
  fastify.get('/me', { onRequest: [authMiddleware] }, async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await authService.getUserById(request.userId);

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return reply.send({ user });
  });

  // Update profile
  fastify.patch('/me', { onRequest: [authMiddleware] }, async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const body = updateProfileSchema.parse(request.body);

    const user = await authService.updateUser(request.userId, body);

    return reply.send({ user });
  });

  // Refresh token
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    if (!refreshToken) {
      return reply.code(400).send({ error: 'Refresh token required' });
    }

    try {
      const payload = fastify.jwt.verify(refreshToken) as {
        sub: string;
        type: string;
      };

      if (payload.type !== 'refresh') {
        return reply.code(401).send({ error: 'Invalid refresh token' });
      }

      const user = await authService.getUserById(payload.sub);

      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }

      const newAccessToken = fastify.jwt.sign(
        { sub: user.id },
        { expiresIn: '7d' }
      );

      const newRefreshToken = fastify.jwt.sign(
        { sub: user.id, type: 'refresh' },
        { expiresIn: '30d' }
      );

      return reply.send({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      return reply.code(401).send({ error: 'Invalid refresh token' });
    }
  });

  // Logout (client-side token removal)
  fastify.post('/logout', { onRequest: [authMiddleware] }, async (_request, reply) => {
    return reply.send({ message: 'Logged out successfully' });
  });
}
