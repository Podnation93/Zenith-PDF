import type { FastifyInstance } from 'fastify';
import type { SocketStream } from '@fastify/websocket';
import { connectionManager } from './connection.manager.js';
import { messageHandler } from './message.handler.js';
import { logger } from '../utils/logger.js';

export async function setupWebSocket(fastify: FastifyInstance) {
  fastify.get('/ws/:documentId', { websocket: true }, async (socket: SocketStream, request) => {
    const { documentId } = request.params as { documentId: string };
    let connectionId: string | null = null;

    try {
      // Authenticate user via JWT
      await request.jwtVerify();
      const payload = request.user as { sub: string };
      const userId = payload?.sub;

      if (!userId) {
        socket.socket.close(1008, 'Authentication required');
        return;
      }

      // Add connection
      connectionId = await connectionManager.addConnection(
        socket.socket,
        userId,
        documentId
      );

      // Handle incoming messages
      socket.socket.on('message', async (rawMessage: Buffer) => {
        const message = rawMessage.toString();
        await messageHandler.handleMessage(connectionId!, message, userId);
      });

      // Handle connection close
      socket.socket.on('close', async () => {
        if (connectionId) {
          await connectionManager.removeConnection(connectionId);
        }
      });

      // Handle errors
      socket.socket.on('error', (error) => {
        logger.error({ error, connectionId, userId }, 'WebSocket error');
        if (connectionId) {
          connectionManager.removeConnection(connectionId);
        }
      });

      // Send initial connection success message
      socket.socket.send(
        JSON.stringify({
          type: 'connected',
          connectionId,
          documentId,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      logger.error({ error }, 'Failed to establish WebSocket connection');
      socket.socket.close(1011, 'Internal server error');
    }
  });
}
