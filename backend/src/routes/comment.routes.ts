import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { commentService } from '../services/comment.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireDocumentAccess } from '../middleware/authorization.middleware.js';

const createCommentSchema = z.object({
  annotationId: z.string().uuid().optional(),
  parentCommentId: z.string().uuid().optional(),
  content: z.string().min(1).max(5000),
  mentionedUserIds: z.array(z.string().uuid()).optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

const resolveCommentSchema = z.object({
  resolved: z.boolean(),
});

export async function commentRoutes(fastify: FastifyInstance) {
  // Create comment
  fastify.post(
    '/:documentId/comments',
    {
      onRequest: [
        authMiddleware,
        requireDocumentAccess({ requiredLevel: 'comment' }),
      ],
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { documentId } = request.params as { documentId: string };
      const body = createCommentSchema.parse(request.body);

      const comment = await commentService.createComment(
        request.userId,
        documentId,
        body
      );

      return reply.code(201).send({ comment });
    }
  );

  // Get comments for document
  fastify.get(
    '/:documentId/comments',
    {
      onRequest: [
        authMiddleware,
        requireDocumentAccess({ requiredLevel: 'view' }),
      ],
    },
    async (request, reply) => {
      const { documentId } = request.params as { documentId: string };

      const comments = await commentService.getCommentsByDocument(documentId);

      return reply.send({ comments });
    }
  );

  // Get comments for annotation
  fastify.get(
    '/:documentId/annotations/:annotationId/comments',
    {
      onRequest: [
        authMiddleware,
        requireDocumentAccess({ requiredLevel: 'view' }),
      ],
    },
    async (request, reply) => {
      const { annotationId } = request.params as { annotationId: string };

      const comments = await commentService.getCommentsByAnnotation(annotationId);

      return reply.send({ comments });
    }
  );

  // Get comment thread
  fastify.get(
    '/:documentId/comments/:commentId/thread',
    {
      onRequest: [
        authMiddleware,
        requireDocumentAccess({ requiredLevel: 'view' }),
      ],
    },
    async (request, reply) => {
      const { commentId } = request.params as { commentId: string };

      const thread = await commentService.getCommentThread(commentId);

      return reply.send({ thread });
    }
  );

  // Update comment
  fastify.patch(
    '/:documentId/comments/:commentId',
    {
      onRequest: [
        authMiddleware,
        requireDocumentAccess({ requiredLevel: 'comment' }),
      ],
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { commentId } = request.params as { commentId: string };
      const body = updateCommentSchema.parse(request.body);

      const comment = await commentService.updateComment(
        commentId,
        request.userId,
        body.content
      );

      return reply.send({ comment });
    }
  );

  // Resolve/unresolve comment
  fastify.patch(
    '/:documentId/comments/:commentId/resolve',
    {
      onRequest: [
        authMiddleware,
        requireDocumentAccess({ requiredLevel: 'comment' }),
      ],
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { commentId } = request.params as { commentId: string };
      const body = resolveCommentSchema.parse(request.body);

      const comment = await commentService.resolveComment(
        commentId,
        request.userId,
        body.resolved
      );

      return reply.send({ comment });
    }
  );

  // Delete comment
  fastify.delete(
    '/:documentId/comments/:commentId',
    {
      onRequest: [
        authMiddleware,
        requireDocumentAccess({ requiredLevel: 'comment' }),
      ],
    },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { commentId } = request.params as { commentId: string };

      await commentService.deleteComment(commentId, request.userId);

      return reply.code(204).send();
    }
  );
}
