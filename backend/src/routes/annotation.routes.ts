import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { annotationService } from '../services/annotation.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireDocumentAccess } from '../middleware/authorization.middleware.js';

const createAnnotationSchema = z.object({
  annotationType: z.enum([
    'highlight',
    'comment',
    'sticky_note',
    'underline',
    'strikethrough',
    'drawing',
    'shape',
    'text_edit',
    'image_edit',
  ]),
  pageNumber: z.number().int().positive(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  style: z
    .object({
      color: z.string().optional(),
      thickness: z.number().optional(),
      opacity: z.number().optional(),
      font: z.string().optional(),
    })
    .optional(),
  content: z.string().optional(),
});

const updateAnnotationSchema = z.object({
  position: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  style: z
    .object({
      color: z.string().optional(),
      thickness: z.number().optional(),
      opacity: z.number().optional(),
      font: z.string().optional(),
    })
    .optional(),
  content: z.string().optional(),
});

export async function annotationRoutes(fastify: FastifyInstance) {
  // Create annotation
  fastify.post(
    '/:documentId/annotations',
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
      const body = createAnnotationSchema.parse(request.body);

      const annotation = await annotationService.createAnnotation(
        request.userId,
        documentId,
        body
      );

      return reply.code(201).send({ annotation });
    }
  );

  // Get annotations for document
  fastify.get(
    '/:documentId/annotations',
    {
      onRequest: [
        authMiddleware,
        requireDocumentAccess({ requiredLevel: 'view' }),
      ],
    },
    async (request, reply) => {
      const { documentId } = request.params as { documentId: string };
      const { page } = request.query as { page?: string };

      const pageNumber = page ? parseInt(page) : undefined;

      const annotations = await annotationService.getAnnotationsByDocument(
        documentId,
        pageNumber
      );

      return reply.send({ annotations });
    }
  );

  // Get single annotation
  fastify.get(
    '/:documentId/annotations/:annotationId',
    {
      onRequest: [
        authMiddleware,
        requireDocumentAccess({ requiredLevel: 'view' }),
      ],
    },
    async (request, reply) => {
      const { annotationId } = request.params as { annotationId: string };

      const annotation = await annotationService.getAnnotation(annotationId);

      if (!annotation) {
        return reply.code(404).send({ error: 'Annotation not found' });
      }

      return reply.send({ annotation });
    }
  );

  // Update annotation
  fastify.patch(
    '/:documentId/annotations/:annotationId',
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

      const { annotationId } = request.params as { annotationId: string };
      const body = updateAnnotationSchema.parse(request.body);

      const annotation = await annotationService.updateAnnotation(
        annotationId,
        request.userId,
        body
      );

      return reply.send({ annotation });
    }
  );

  // Delete annotation
  fastify.delete(
    '/:documentId/annotations/:annotationId',
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

      const { annotationId } = request.params as { annotationId: string };

      await annotationService.deleteAnnotation(annotationId, request.userId);

      return reply.code(204).send();
    }
  );
}
