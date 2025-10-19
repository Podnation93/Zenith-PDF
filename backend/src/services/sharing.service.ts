import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { generateShareToken } from '../utils/crypto.js';
import { hashPassword } from '../utils/crypto.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';
import type { ShareLink, AccessLevel, Permission } from '../types/index.js';

export class SharingService {
  async createShareLink(
    userId: string,
    documentId: string,
    accessLevel: AccessLevel,
    options?: {
      expiresAt?: Date;
      password?: string;
      maxUses?: number;
    }
  ): Promise<ShareLink> {
    // Verify user has admin access to document
    const hasAccess = await pool.query(
      'SELECT user_has_document_access($1, $2, $3) as has_access',
      [userId, documentId, 'admin']
    );

    if (!hasAccess.rows[0]?.has_access) {
      throw new ForbiddenError('Insufficient permissions to create share link');
    }

    const shareToken = generateShareToken();
    let passwordHash: string | null = null;

    if (options?.password) {
      passwordHash = await hashPassword(options.password);
    }

    const result = await pool.query(
      `INSERT INTO share_links (
        id, document_id, created_by, share_token, access_level,
        password_hash, max_uses, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        uuidv4(),
        documentId,
        userId,
        shareToken,
        accessLevel,
        passwordHash,
        options?.maxUses || null,
        options?.expiresAt || null,
      ]
    );

    return this.mapShareLinkFromDb(result.rows[0]);
  }

  async getShareLink(shareToken: string): Promise<ShareLink | null> {
    const result = await pool.query(
      `SELECT * FROM share_links
       WHERE share_token = $1
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR use_count < max_uses)`,
      [shareToken]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapShareLinkFromDb(result.rows[0]);
  }

  async incrementShareLinkUse(shareToken: string): Promise<void> {
    await pool.query(
      'UPDATE share_links SET use_count = use_count + 1 WHERE share_token = $1',
      [shareToken]
    );
  }

  async revokeShareLink(userId: string, shareLinkId: string): Promise<void> {
    // Verify ownership
    const link = await pool.query(
      'SELECT * FROM share_links WHERE id = $1',
      [shareLinkId]
    );

    if (link.rows.length === 0) {
      throw new NotFoundError('Share link not found');
    }

    if (link.rows[0].created_by !== userId) {
      throw new ForbiddenError('Only creator can revoke share link');
    }

    await pool.query(
      'UPDATE share_links SET revoked_at = NOW() WHERE id = $1',
      [shareLinkId]
    );
  }

  async getShareLinksForDocument(documentId: string): Promise<ShareLink[]> {
    const result = await pool.query(
      `SELECT * FROM share_links
       WHERE document_id = $1 AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [documentId]
    );

    return result.rows.map(this.mapShareLinkFromDb);
  }

  async grantPermission(
    grantedBy: string,
    documentId: string,
    userId: string,
    accessLevel: AccessLevel,
    expiresAt?: Date
  ): Promise<Permission> {
    // Verify grantor has admin access
    const hasAccess = await pool.query(
      'SELECT user_has_document_access($1, $2, $3) as has_access',
      [grantedBy, documentId, 'admin']
    );

    if (!hasAccess.rows[0]?.has_access) {
      throw new ForbiddenError('Insufficient permissions to grant access');
    }

    // Check if permission already exists
    const existing = await pool.query(
      'SELECT id FROM permissions WHERE document_id = $1 AND user_id = $2',
      [documentId, userId]
    );

    if (existing.rows.length > 0) {
      // Update existing permission
      const result = await pool.query(
        `UPDATE permissions
         SET access_level = $1, granted_by = $2, granted_at = NOW(),
             expires_at = $3, revoked_at = NULL
         WHERE document_id = $4 AND user_id = $5
         RETURNING *`,
        [accessLevel, grantedBy, expiresAt || null, documentId, userId]
      );
      return this.mapPermissionFromDb(result.rows[0]);
    }

    // Create new permission
    const result = await pool.query(
      `INSERT INTO permissions (
        id, document_id, user_id, access_level, granted_by, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [uuidv4(), documentId, userId, accessLevel, grantedBy, expiresAt || null]
    );

    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, document_id, action, metadata) VALUES ($1, $2, $3, $4)',
      [
        grantedBy,
        documentId,
        'permission_grant',
        JSON.stringify({ grantedTo: userId, accessLevel }),
      ]
    );

    return this.mapPermissionFromDb(result.rows[0]);
  }

  async revokePermission(
    revokedBy: string,
    permissionId: string
  ): Promise<void> {
    const permission = await pool.query(
      'SELECT * FROM permissions WHERE id = $1',
      [permissionId]
    );

    if (permission.rows.length === 0) {
      throw new NotFoundError('Permission not found');
    }

    // Verify revoker has admin access
    const hasAccess = await pool.query(
      'SELECT user_has_document_access($1, $2, $3) as has_access',
      [revokedBy, permission.rows[0].document_id, 'admin']
    );

    if (!hasAccess.rows[0]?.has_access) {
      throw new ForbiddenError('Insufficient permissions to revoke access');
    }

    await pool.query(
      'UPDATE permissions SET revoked_at = NOW() WHERE id = $1',
      [permissionId]
    );

    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, document_id, action, metadata) VALUES ($1, $2, $3, $4)',
      [
        revokedBy,
        permission.rows[0].document_id,
        'permission_revoke',
        JSON.stringify({ revokedFrom: permission.rows[0].user_id }),
      ]
    );
  }

  async getDocumentPermissions(documentId: string): Promise<Permission[]> {
    const result = await pool.query(
      `SELECT * FROM permissions
       WHERE document_id = $1 AND revoked_at IS NULL
       ORDER BY granted_at DESC`,
      [documentId]
    );

    return result.rows.map(this.mapPermissionFromDb);
  }

  private mapShareLinkFromDb(row: any): ShareLink {
    return {
      id: row.id,
      documentId: row.document_id,
      createdBy: row.created_by,
      shareToken: row.share_token,
      accessLevel: row.access_level,
      passwordHash: row.password_hash,
      maxUses: row.max_uses,
      useCount: row.use_count,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
    };
  }

  private mapPermissionFromDb(row: any): Permission {
    return {
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      accessLevel: row.access_level,
      grantedBy: row.granted_by,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
    };
  }
}

export const sharingService = new SharingService();
