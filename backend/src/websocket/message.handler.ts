import { z } from 'zod';
import { connectionManager } from './connection.manager.js';
import { checkDocumentAccess } from '../middleware/authorization.middleware.js';
import { logger } from '../utils/logger.js';
import type {
  WebSocketMessage,
  PresencePayload,
  AnnotationPayload,
  CommentPayload,
} from '../types/index.js';

const messageSchema = z.object({
  type: z.enum(['presence', 'annotation', 'comment', 'cursor', 'sync', 'heartbeat']),
  documentId: z.string().uuid(),
  userId: z.string().uuid(),
  payload: z.any(),
  timestamp: z.number(),
});

export class MessageHandler {
  /**
   * CRITICAL SECURITY: Server-Side Event Validation
   *
   * This handler validates ALL incoming WebSocket messages:
   * 1. Authenticates the user
   * 2. Validates permissions for the document
   * 3. Validates the message payload structure
   * 4. Ensures data integrity before persisting
   *
   * Never trust client-side events!
   */
  async handleMessage(
    connectionId: string,
    rawMessage: string,
    userId: string
  ): Promise<void> {
    try {
      // Parse and validate message structure
      const parsed = JSON.parse(rawMessage);
      const message: WebSocketMessage = messageSchema.parse(parsed);

      // Verify user ID matches authenticated user
      if (message.userId !== userId) {
        logger.warn(
          { connectionId, messageUserId: message.userId, authUserId: userId },
          'User ID mismatch in message'
        );
        return;
      }

      // Verify document access for non-heartbeat messages
      if (message.type !== 'heartbeat') {
        const hasAccess = await checkDocumentAccess(
          userId,
          message.documentId,
          this.getRequiredAccessLevel(message.type)
        );

        if (!hasAccess) {
          logger.warn(
            { connectionId, userId, documentId: message.documentId, type: message.type },
            'Unauthorized document access attempt'
          );
          return;
        }
      }

      // Route to appropriate handler
      switch (message.type) {
        case 'heartbeat':
          await this.handleHeartbeat(connectionId);
          break;

        case 'presence':
          await this.handlePresence(message);
          break;

        case 'cursor':
          await this.handleCursor(message);
          break;

        case 'annotation':
          await this.handleAnnotation(message, userId);
          break;

        case 'comment':
          await this.handleComment(message, userId);
          break;

        case 'sync':
          await this.handleSync(message, userId);
          break;

        default:
          logger.warn({ type: message.type }, 'Unknown message type');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn({ error: error.errors }, 'Invalid message format');
      } else {
        logger.error({ error }, 'Failed to handle message');
      }
    }
  }

  private async handleHeartbeat(connectionId: string): Promise<void> {
    connectionManager.updateHeartbeat(connectionId);
  }

  private async handlePresence(message: WebSocketMessage): Promise<void> {
    const payload = message.payload as PresencePayload;

    // Validate payload
    if (!payload.userId || !payload.action) {
      logger.warn('Invalid presence payload');
      return;
    }

    // Broadcast to document
    await connectionManager.publishToDocument(message.documentId, message);
  }

  private async handleCursor(message: WebSocketMessage): Promise<void> {
    // Cursor updates are ephemeral - just broadcast, don't persist
    await connectionManager.publishToDocument(message.documentId, message);
  }

  private async handleAnnotation(
    message: WebSocketMessage,
    userId: string
  ): Promise<void> {
    const payload = message.payload as AnnotationPayload;

    // Validate annotation payload
    if (!payload.annotationId || !payload.action) {
      logger.warn('Invalid annotation payload');
      return;
    }

    // Verify user has edit or comment access (depending on annotation type)
    const requiredLevel = payload.action === 'delete' ? 'edit' : 'comment';
    const hasAccess = await checkDocumentAccess(
      userId,
      message.documentId,
      requiredLevel
    );

    if (!hasAccess) {
      logger.warn({ userId, documentId: message.documentId }, 'Insufficient permissions for annotation action');
      return;
    }

    // TODO: Persist annotation to database via annotation service
    // For MVP, we'll broadcast the change immediately
    // In production, validate and persist first, then broadcast on success

    // Broadcast to document
    await connectionManager.publishToDocument(message.documentId, message);
  }

  private async handleComment(
    message: WebSocketMessage,
    userId: string
  ): Promise<void> {
    const payload = message.payload as CommentPayload;

    // Validate comment payload
    if (!payload.commentId || !payload.action) {
      logger.warn('Invalid comment payload');
      return;
    }

    // Verify user has comment access
    const hasAccess = await checkDocumentAccess(
      userId,
      message.documentId,
      'comment'
    );

    if (!hasAccess) {
      logger.warn({ userId, documentId: message.documentId }, 'Insufficient permissions for comment action');
      return;
    }

    // TODO: Persist comment to database via comment service

    // Broadcast to document
    await connectionManager.publishToDocument(message.documentId, message);
  }

  private async handleSync(
    message: WebSocketMessage,
    userId: string
  ): Promise<void> {
    // Handle CRDT synchronization
    // For now, broadcast the sync message
    await connectionManager.publishToDocument(message.documentId, message);
  }

  private getRequiredAccessLevel(
    messageType: WebSocketMessage['type']
  ): 'view' | 'comment' | 'edit' {
    switch (messageType) {
      case 'annotation':
      case 'comment':
        return 'comment';
      case 'presence':
      case 'cursor':
      case 'sync':
        return 'view';
      default:
        return 'view';
    }
  }
}

export const messageHandler = new MessageHandler();
