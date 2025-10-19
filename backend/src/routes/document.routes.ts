import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { documentService } from '../services/document.service.js';
import { sharingService } from '../services/sharing.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireDocumentAccess } from '../middleware/authorization.middleware.js';

const createShareLinkSchema = z.object({
  accessLevel: z.enum(['view', 'comment']),
  expiresAt: z.string().datetime().optional(),
  password: z.string().optional(),
  maxUses: z.number().int().positive().optional(),
});

const grantPermissionSchema = z.object({
  userId: z.string().uuid(),
  accessLevel: z.enum(['view', 'comment', 'edit', 'admin']),
  expiresAt: z.string().datetime().optional(),
});

export async function documentRoutes(fastify: FastifyInstance) {
  // Upload document
  fastify.post(
    '/upload',
    { onRequest: [authMiddleware] },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      const buffer = await data.toBuffer();
      const filename = data.filename;
      const mimeType = data.mimetype;

      const document = await documentService.uploadDocument(
        request.userId,
        buffer,
        filename,
        mimeType
      );

      return reply.code(201).send({ document });
    }
  );

  // Get user's documents
  fastify.get(
    '/',
    { onRequest: [authMiddleware] },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const documents = await documentService.getDocumentsByUser(request.userId);

      return reply.send({ documents });
    }
  );

  // Get document by ID
  fastify.get(
    '/:documentId',
    {
      onRequest: [
        authMiddleware,
        requireDocumentAccess({ requiredLevel: 'view' }),
      ],
    },
    async (request, reply) => {
      const { documentId } = request.params as { documentId: string };

      const document = await documentService.getDocument(documentId);

      if (!document) {
        return reply.code(404).send({ error: 'Document not found' });
      }

      return reply.send({ document });
    }
  );

  // Get document download URL
  fastify.get(
    '/:documentId/download',
    {
      onRequest: [
        authMiddleware,
        requireDocumentAccess({ requiredLevel: 'view' }),
      ],
    },
    async (request, reply) => {
      const { documentId } = request.params as { documentId: string };

      const url = await documentService.getDocumentDownloadUrl(documentId);

      return reply.send({ url });
    }
  );

  // Delete document
  fastify.delete(
    '/:documentId',
    { onRequest: [authMiddleware] },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { documentId } = request.params as { documentId: string };

      await documentService.deleteDocument(documentId, request.userId);

      return reply.code(204).send();
    }
  );

  // Create share link
  fastify.post(
    '/:documentId/share',
    { onRequest: [authMiddleware] },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { documentId } = request.params as { documentId: string };
      const body = createShareLinkSchema.parse(request.body);

      const shareLink = await sharingService.createShareLink(
        request.userId,
        documentId,
        body.accessLevel,
        {
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
          password: body.password,
          maxUses: body.maxUses,
        }
      );

      return reply.code(201).send({ shareLink });
    }
  );

  // Get share links for document
  fastify.get(
    '/:documentId/share',
    {
      onRequest: [
        authMiddleware,
        requireDocumentAccess({ requiredLevel: 'admin' }),
      ],
    },
    async (request, reply) => {
      const { documentId } = request.params as { documentId: string };

      const shareLinks = await sharingService.getShareLinksForDocument(documentId);

      return reply.send({ shareLinks });
    }
  );

  // Revoke share link
  fastify.delete(
    '/:documentId/share/:shareLinkId',
    { onRequest: [authMiddleware] },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { shareLinkId } = request.params as { shareLinkId: string };

      await sharingService.revokeShareLink(request.userId, shareLinkId);

      return reply.code(204).send();
    }
  );

  // Grant permission to user
  fastify.post(
    '/:documentId/permissions',
    { onRequest: [authMiddleware] },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { documentId } = request.params as { documentId: string };
      const body = grantPermissionSchema.parse(request.body);

      const permission = await sharingService.grantPermission(
        request.userId,
        documentId,
        body.userId,
        body.accessLevel,
        body.expiresAt ? new Date(body.expiresAt) : undefined
      );

      return reply.code(201).send({ permission });
    }
  );

  // Get document permissions
  fastify.get(
    '/:documentId/permissions',
    {
      onRequest: [
        authMiddleware,
        requireDocumentAccess({ requiredLevel: 'admin' }),
      ],
    },
    async (request, reply) => {
      const { documentId } = request.params as { documentId: string };

      const permissions = await sharingService.getDocumentPermissions(documentId);

      return reply.send({ permissions });
    }
  );

  // Revoke permission
  fastify.delete(
    '/:documentId/permissions/:permissionId',
    { onRequest: [authMiddleware] },
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { permissionId } = request.params as { permissionId: string };

      await sharingService.revokePermission(request.userId, permissionId);

      return reply.code(204).send();
    }
  );
}
