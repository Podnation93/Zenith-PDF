import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
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

// Register security plugins
// Helmet - Security headers
await fastify.register(helmet, {
  // Customize Content Security Policy for the app
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Chakra UI
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", env.CORS_ORIGIN],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Enable other security headers
  crossOriginEmbedderPolicy: false, // PDF.js requires this to be false
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

// Rate limiting - Global rate limit
await fastify.register(rateLimit, {
  max: 100, // Maximum requests per time window
  timeWindow: '1 minute',
  cache: 10000, // Cache size for storing request counts
  allowList: ['127.0.0.1'], // Whitelist localhost for development
  redis: env.NODE_ENV === 'production' ? undefined : undefined, // Can add Redis for distributed rate limiting
  skipOnError: false, // Don't skip rate limiting on errors
  keyGenerator: (request) => {
    // Use IP address or user ID for rate limiting
    return request.userId || request.ip;
  },
  errorResponseBuilder: () => {
    return {
      error: 'Too Many Requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      statusCode: 429,
    };
  },
});

// CORS - Cross-Origin Resource Sharing
await fastify.register(cors, {
  origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
});

// JWT Authentication
await fastify.register(jwt, {
  secret: env.JWT_SECRET,
  sign: {
    expiresIn: '7d', // Access token expiry
  },
});

// Multipart form data (file uploads)
await fastify.register(multipart, {
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: 1,
    fields: 10,
  },
  attachFieldsToBody: false,
});

// WebSocket support
await fastify.register(websocket, {
  options: {
    maxPayload: 1048576, // 1MB max message size
    clientTracking: true,
  },
});

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
