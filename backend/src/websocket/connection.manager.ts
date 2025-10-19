import type { WebSocket } from '@fastify/websocket';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { WebSocketMessage, PresencePayload } from '../types/index.js';

interface Connection {
  ws: WebSocket;
  userId: string;
  documentId: string;
  connectionId: string;
  lastHeartbeat: number;
}

export class ConnectionManager {
  private connections: Map<string, Connection> = new Map();
  private redis: Redis;
  private redisSub: Redis;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Redis client for publishing
    this.redis = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      db: env.REDIS_DB,
    });

    // Redis client for subscribing (separate connection required)
    this.redisSub = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      db: env.REDIS_DB,
    });

    this.setupRedisSubscription();
    this.startHeartbeatChecker();
  }

  private setupRedisSubscription() {
    // Subscribe to all document channels
    this.redisSub.psubscribe('document:*', (err) => {
      if (err) {
        logger.error({ err }, 'Failed to subscribe to Redis channels');
      } else {
        logger.info('Subscribed to document channels');
      }
    });

    // Handle incoming messages from Redis
    this.redisSub.on('pmessage', (_pattern, channel, message) => {
      try {
        const data: WebSocketMessage = JSON.parse(message);
        const documentId = channel.split(':')[1];

        // Broadcast to all connections for this document
        this.broadcastToDocument(documentId, data, data.userId);
      } catch (error) {
        logger.error({ error }, 'Failed to parse Redis message');
      }
    });
  }

  private startHeartbeatChecker() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = env.WS_HEARTBEAT_INTERVAL + env.WS_HEARTBEAT_TIMEOUT;

      for (const [connectionId, conn] of this.connections.entries()) {
        if (now - conn.lastHeartbeat > timeout) {
          logger.warn(
            { connectionId, userId: conn.userId },
            'Connection timeout, closing'
          );
          this.removeConnection(connectionId);
        }
      }
    }, env.WS_HEARTBEAT_INTERVAL);
  }

  async addConnection(
    ws: WebSocket,
    userId: string,
    documentId: string
  ): Promise<string> {
    const connectionId = uuidv4();

    this.connections.set(connectionId, {
      ws,
      userId,
      documentId,
      connectionId,
      lastHeartbeat: Date.now(),
    });

    // Save to database
    await pool.query(
      `INSERT INTO active_sessions (id, user_id, document_id, connection_id)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), userId, documentId, connectionId]
    );

    // Broadcast presence to other users
    const presencePayload: PresencePayload = {
      userId,
      userName: 'User', // TODO: Get from user service
      avatarUrl: null,
      cursorPosition: null,
      activePage: null,
      action: 'join',
    };

    await this.publishToDocument(documentId, {
      type: 'presence',
      documentId,
      userId,
      payload: presencePayload,
      timestamp: Date.now(),
    });

    logger.info({ connectionId, userId, documentId }, 'User connected');

    return connectionId;
  }

  async removeConnection(connectionId: string): Promise<void> {
    const conn = this.connections.get(connectionId);

    if (!conn) {
      return;
    }

    this.connections.delete(connectionId);

    // Update database
    await pool.query(
      'UPDATE active_sessions SET disconnected_at = NOW() WHERE connection_id = $1',
      [connectionId]
    );

    // Broadcast presence to other users
    const presencePayload: PresencePayload = {
      userId: conn.userId,
      userName: 'User',
      avatarUrl: null,
      cursorPosition: null,
      activePage: null,
      action: 'leave',
    };

    await this.publishToDocument(conn.documentId, {
      type: 'presence',
      documentId: conn.documentId,
      userId: conn.userId,
      payload: presencePayload,
      timestamp: Date.now(),
    });

    // Close WebSocket if still open
    if (conn.ws.readyState === 1) {
      conn.ws.close();
    }

    logger.info({ connectionId, userId: conn.userId }, 'User disconnected');
  }

  updateHeartbeat(connectionId: string): void {
    const conn = this.connections.get(connectionId);

    if (conn) {
      conn.lastHeartbeat = Date.now();

      // Update database periodically (every 10 heartbeats to reduce DB load)
      if (conn.lastHeartbeat % 10 === 0) {
        pool.query(
          'UPDATE active_sessions SET last_heartbeat = NOW() WHERE connection_id = $1',
          [connectionId]
        ).catch((error) => {
          logger.error({ error }, 'Failed to update heartbeat in DB');
        });
      }
    }
  }

  async publishToDocument(
    documentId: string,
    message: WebSocketMessage
  ): Promise<void> {
    const channel = `document:${documentId}`;
    await this.redis.publish(channel, JSON.stringify(message));
  }

  private broadcastToDocument(
    documentId: string,
    message: WebSocketMessage,
    excludeUserId?: string
  ): void {
    for (const conn of this.connections.values()) {
      if (
        conn.documentId === documentId &&
        conn.userId !== excludeUserId &&
        conn.ws.readyState === 1
      ) {
        try {
          conn.ws.send(JSON.stringify(message));
        } catch (error) {
          logger.error({ error, connectionId: conn.connectionId }, 'Failed to send message');
        }
      }
    }
  }

  async getActiveUsers(documentId: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT DISTINCT user_id
       FROM active_sessions
       WHERE document_id = $1 AND disconnected_at IS NULL`,
      [documentId]
    );

    return result.rows.map((row) => row.user_id);
  }

  getConnectionsByDocument(documentId: string): Connection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.documentId === documentId
    );
  }

  async cleanup(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const connectionId of this.connections.keys()) {
      await this.removeConnection(connectionId);
    }

    await this.redis.quit();
    await this.redisSub.quit();

    logger.info('Connection manager cleaned up');
  }
}

export const connectionManager = new ConnectionManager();
