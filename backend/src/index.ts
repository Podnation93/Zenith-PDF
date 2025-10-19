import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import pool from './config/database.js';
import { authRoutes } from './routes/auth.routes.js';
import { documentRoutes } from './routes/document.routes.js';
import { annotationRoutes } from './routes/annotation.routes.js';
import { commentRoutes } from './routes/comment.routes.js';
import { setupWebSocket } from './websocket/index.js';
import { connectionManager } from './websocket/connection.manager.js';
import type { ZodError } from 'zod';

const fastify = Fastify({
  logger: logger,
  trustProxy: true,
  bodyLimit: env.MAX_FILE_SIZE,
});

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  // Handle Zod validation errors
  if ((error as any).validation) {
    const zodError = error as any as ZodError;
    return reply.code(400).send({
      error: 'Validation Error',
      details: zodError.errors || (error as any).validation,
    });
  }

  // Handle known application errors
  if ((error as any).statusCode) {
    return reply.code((error as any).statusCode).send({
      error: error.message,
      code: (error as any).code,
    });
  }

  // Log unexpected errors
  logger.error({ error }, 'Unexpected error');

  return reply.code(500).send({
    error: 'Internal Server Error',
  });
});

// Register plugins
await fastify.register(cors, {
  origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  credentials: true,
});

await fastify.register(jwt, {
  secret: env.JWT_SECRET,
});

await fastify.register(multipart, {
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: 1,
  },
});

await fastify.register(websocket);

// Health check
fastify.get('/health', async (_request, reply) => {
  try {
    // Check database
    await pool.query('SELECT 1');

    return reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    return reply.code(503).send({
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(documentRoutes, { prefix: '/api/documents' });
await fastify.register(annotationRoutes, { prefix: '/api/documents' });
await fastify.register(commentRoutes, { prefix: '/api/documents' });

// Register WebSocket
await setupWebSocket(fastify);

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');

  try {
    await connectionManager.cleanup();
    await pool.end();
    await fastify.close();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
try {
  await fastify.listen({
    port: env.PORT,
    host: env.HOST,
  });

  logger.info(
    `🚀 Zenith PDF Backend running at http://${env.HOST}:${env.PORT}`
  );
  logger.info(`📝 Environment: ${env.NODE_ENV}`);
  logger.info(`🔌 WebSocket endpoint: ws://${env.HOST}:${env.PORT}/ws/:documentId`);
} catch (error) {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
}
