import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';
import type { Comment } from '../types/index.js';

export class CommentService {
  async createComment(
    userId: string,
    documentId: string,
    data: {
      annotationId?: string;
      parentCommentId?: string;
      content: string;
      mentionedUserIds?: string[];
    }
  ): Promise<Comment> {
    const { annotationId, parentCommentId, content, mentionedUserIds } = data;

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new ValidationError('Comment content is required');
    }

    if (content.length > 5000) {
      throw new ValidationError('Comment content exceeds 5000 characters');
    }

    const commentId = uuidv4();

    const result = await pool.query(
      `INSERT INTO comments (
        id, annotation_id, document_id, user_id, parent_comment_id,
        content, mentioned_user_ids
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        commentId,
        annotationId || null,
        documentId,
        userId,
        parentCommentId || null,
        content,
        mentionedUserIds || [],
      ]
    );

    // Create notifications for mentioned users
    if (mentionedUserIds && mentionedUserIds.length > 0) {
      await this.createMentionNotifications(
        commentId,
        userId,
        documentId,
        mentionedUserIds
      );
    }

    // Create notification for parent comment author
    if (parentCommentId) {
      await this.createReplyNotification(commentId, userId, documentId, parentCommentId);
    }

    return this.mapCommentFromDb(result.rows[0]);
  }

  async getComment(commentId: string): Promise<Comment | null> {
    const result = await pool.query(
      'SELECT * FROM comments WHERE id = $1 AND deleted_at IS NULL',
      [commentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapCommentFromDb(result.rows[0]);
  }

  async getCommentsByDocument(documentId: string): Promise<Comment[]> {
    const result = await pool.query(
      `SELECT * FROM comments
       WHERE document_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [documentId]
    );

    return result.rows.map(this.mapCommentFromDb);
  }

  async getCommentsByAnnotation(annotationId: string): Promise<Comment[]> {
    const result = await pool.query(
      `SELECT * FROM comments
       WHERE annotation_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [annotationId]
    );

    return result.rows.map(this.mapCommentFromDb);
  }

  async getCommentThread(parentCommentId: string): Promise<Comment[]> {
    const result = await pool.query(
      `WITH RECURSIVE comment_tree AS (
        SELECT * FROM comments WHERE id = $1 AND deleted_at IS NULL
        UNION ALL
        SELECT c.* FROM comments c
        INNER JOIN comment_tree ct ON c.parent_comment_id = ct.id
        WHERE c.deleted_at IS NULL
      )
      SELECT * FROM comment_tree ORDER BY created_at ASC`,
      [parentCommentId]
    );

    return result.rows.map(this.mapCommentFromDb);
  }

  async updateComment(
    commentId: string,
    userId: string,
    content: string
  ): Promise<Comment> {
    const comment = await this.getComment(commentId);

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenError('Only comment author can update');
    }

    if (content.length > 5000) {
      throw new ValidationError('Comment content exceeds 5000 characters');
    }

    const result = await pool.query(
      `UPDATE comments
       SET content = $1
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [content, commentId]
    );

    return this.mapCommentFromDb(result.rows[0]);
  }

  async resolveComment(
    commentId: string,
    userId: string,
    resolved: boolean
  ): Promise<Comment> {
    const comment = await this.getComment(commentId);

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    const result = await pool.query(
      `UPDATE comments
       SET resolved = $1, resolved_by = $2, resolved_at = $3
       WHERE id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [resolved, userId, resolved ? new Date() : null, commentId]
    );

    return this.mapCommentFromDb(result.rows[0]);
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.getComment(commentId);

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenError('Only comment author can delete');
    }

    await pool.query(
      'UPDATE comments SET deleted_at = NOW() WHERE id = $1',
      [commentId]
    );
  }

  private async createMentionNotifications(
    commentId: string,
    triggeredBy: string,
    documentId: string,
    userIds: string[]
  ): Promise<void> {
    for (const userId of userIds) {
      if (userId !== triggeredBy) {
        await pool.query(
          `INSERT INTO notifications (
            id, user_id, notification_type, document_id, comment_id,
            triggered_by_user_id, message
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            userId,
            'mention',
            documentId,
            commentId,
            triggeredBy,
            'You were mentioned in a comment',
          ]
        );
      }
    }
  }

  private async createReplyNotification(
    commentId: string,
    triggeredBy: string,
    documentId: string,
    parentCommentId: string
  ): Promise<void> {
    const parentComment = await this.getComment(parentCommentId);

    if (parentComment && parentComment.userId !== triggeredBy) {
      await pool.query(
        `INSERT INTO notifications (
          id, user_id, notification_type, document_id, comment_id,
          triggered_by_user_id, message
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          parentComment.userId,
          'comment_reply',
          documentId,
          commentId,
          triggeredBy,
          'Someone replied to your comment',
        ]
      );
    }
  }

  private mapCommentFromDb(row: any): Comment {
    return {
      id: row.id,
      annotationId: row.annotation_id,
      documentId: row.document_id,
      userId: row.user_id,
      parentCommentId: row.parent_comment_id,
      content: row.content,
      mentionedUserIds: row.mentioned_user_ids || [],
      resolved: row.resolved,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }
}

export const commentService = new CommentService();
