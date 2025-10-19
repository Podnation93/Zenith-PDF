import type { FastifyRequest, FastifyReply } from 'fastify';
import pool from '../config/database.js';
import { ForbiddenError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import type { AccessLevel } from '../types/index.js';

/**
 * CRITICAL SECURITY: Authorization Middleware with IDOR Protection
 *
 * This middleware enforces strict access control by validating that:
 * 1. User is authenticated (has valid userId)
 * 2. User has appropriate permissions for the requested document
 * 3. Access level meets the minimum requirement for the operation
 *
 * This prevents Insecure Direct Object Reference (IDOR) vulnerabilities
 * by ensuring users cannot access documents they don't have permission for.
 */

interface AuthorizationOptions {
  documentIdParam?: string; // URL param name (default: 'documentId')
  requiredLevel?: AccessLevel; // Minimum access level required
}

export function requireDocumentAccess(options: AuthorizationOptions = {}) {
  const { documentIdParam = 'documentId', requiredLevel = 'view' } = options;

  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    // Ensure user is authenticated
    if (!request.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Extract document ID from params or body
    const documentId =
      (request.params as any)[documentIdParam] ||
      (request.body as any)?.documentId;

    if (!documentId) {
      throw new ForbiddenError('Document ID is required');
    }

    // Check if user has access using the database function
    const result = await pool.query(
      'SELECT user_has_document_access($1, $2, $3) as has_access',
      [request.userId, documentId, requiredLevel]
    );

    if (!result.rows[0]?.has_access) {
      // Check if document exists
      const docExists = await pool.query(
        'SELECT id FROM documents WHERE id = $1 AND deleted_at IS NULL',
        [documentId]
      );

      if (docExists.rows.length === 0) {
        throw new NotFoundError('Document not found');
      }

      throw new ForbiddenError('Insufficient permissions to access this document');
    }

    // Attach documentId to request for downstream use
    (request as any).documentId = documentId;
  };
}

/**
 * Check if user has a specific access level for a document
 */
export async function checkDocumentAccess(
  userId: string,
  documentId: string,
  requiredLevel: AccessLevel = 'view'
): Promise<boolean> {
  const result = await pool.query(
    'SELECT user_has_document_access($1, $2, $3) as has_access',
    [userId, documentId, requiredLevel]
  );

  return result.rows[0]?.has_access || false;
}

/**
 * Get user's access level for a document
 */
export async function getUserAccessLevel(
  userId: string,
  documentId: string
): Promise<AccessLevel | null> {
  // Check if owner
  const ownerResult = await pool.query(
    'SELECT id FROM documents WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
    [documentId, userId]
  );

  if (ownerResult.rows.length > 0) {
    return 'admin';
  }

  // Check permissions
  const permResult = await pool.query(
    `SELECT access_level FROM permissions
     WHERE document_id = $1 AND user_id = $2
       AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [documentId, userId]
  );

  if (permResult.rows.length > 0) {
    return permResult.rows[0].access_level;
  }

  return null;
}
