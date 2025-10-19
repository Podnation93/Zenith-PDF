import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';
import type { Annotation, AnnotationType } from '../types/index.js';

export class AnnotationService {
  async createAnnotation(
    userId: string,
    documentId: string,
    data: {
      annotationType: AnnotationType;
      pageNumber: number;
      position: Annotation['position'];
      style?: Annotation['style'];
      content?: string;
    }
  ): Promise<Annotation> {
    const { annotationType, pageNumber, position, style, content } = data;

    // Validate page number
    if (pageNumber < 1) {
      throw new ValidationError('Page number must be at least 1');
    }

    // Validate position
    if (
      position.x < 0 ||
      position.y < 0 ||
      position.width < 0 ||
      position.height < 0
    ) {
      throw new ValidationError('Invalid position values');
    }

    const annotationId = uuidv4();

    // Initialize CRDT state
    // For MVP, we'll use a simple version-based CRDT
    const crdtState = {
      id: annotationId,
      version: 1,
      createdBy: userId,
      createdAt: Date.now(),
      updates: [],
    };

    const result = await pool.query(
      `INSERT INTO annotations (
        id, document_id, user_id, annotation_type, page_number,
        crdt_state, position, style, content
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        annotationId,
        documentId,
        userId,
        annotationType,
        pageNumber,
        JSON.stringify(crdtState),
        JSON.stringify(position),
        style ? JSON.stringify(style) : null,
        content || null,
      ]
    );

    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, document_id, action, metadata) VALUES ($1, $2, $3, $4)',
      [userId, documentId, 'annotation_create', JSON.stringify({ annotationId })]
    );

    return this.mapAnnotationFromDb(result.rows[0]);
  }

  async getAnnotation(annotationId: string): Promise<Annotation | null> {
    const result = await pool.query(
      'SELECT * FROM annotations WHERE id = $1 AND deleted_at IS NULL',
      [annotationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapAnnotationFromDb(result.rows[0]);
  }

  async getAnnotationsByDocument(
    documentId: string,
    pageNumber?: number
  ): Promise<Annotation[]> {
    let query = `
      SELECT * FROM annotations
      WHERE document_id = $1 AND deleted_at IS NULL
    `;
    const params: any[] = [documentId];

    if (pageNumber !== undefined) {
      query += ' AND page_number = $2';
      params.push(pageNumber);
    }

    query += ' ORDER BY created_at ASC';

    const result = await pool.query(query, params);

    return result.rows.map(this.mapAnnotationFromDb);
  }

  async updateAnnotation(
    annotationId: string,
    userId: string,
    updates: {
      position?: Annotation['position'];
      style?: Annotation['style'];
      content?: string;
      crdtUpdate?: any;
    }
  ): Promise<Annotation> {
    // Get existing annotation
    const existing = await this.getAnnotation(annotationId);

    if (!existing) {
      throw new NotFoundError('Annotation not found');
    }

    // For MVP, allow any user with comment access to update
    // In production, you might want stricter ownership rules

    const fields: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (updates.position) {
      fields.push(`position = $${paramCounter++}`);
      values.push(JSON.stringify(updates.position));
    }

    if (updates.style) {
      fields.push(`style = $${paramCounter++}`);
      values.push(JSON.stringify(updates.style));
    }

    if (updates.content !== undefined) {
      fields.push(`content = $${paramCounter++}`);
      values.push(updates.content);
    }

    if (updates.crdtUpdate) {
      // Merge CRDT update
      const currentCrdt = existing.crdtState as any;
      const newCrdt = {
        ...currentCrdt,
        version: (currentCrdt.version || 0) + 1,
        updates: [...(currentCrdt.updates || []), updates.crdtUpdate],
      };

      fields.push(`crdt_state = $${paramCounter++}`);
      values.push(JSON.stringify(newCrdt));
    }

    if (fields.length === 0) {
      return existing;
    }

    values.push(annotationId);

    const result = await pool.query(
      `UPDATE annotations
       SET ${fields.join(', ')}
       WHERE id = $${paramCounter} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, document_id, action, metadata) VALUES ($1, $2, $3, $4)',
      [userId, existing.documentId, 'annotation_update', JSON.stringify({ annotationId })]
    );

    return this.mapAnnotationFromDb(result.rows[0]);
  }

  async deleteAnnotation(annotationId: string, userId: string): Promise<void> {
    const annotation = await this.getAnnotation(annotationId);

    if (!annotation) {
      throw new NotFoundError('Annotation not found');
    }

    // Only allow deletion by the creator or document owner
    // (Document owner check should be done at route level)
    if (annotation.userId !== userId) {
      throw new ForbiddenError('Only annotation creator can delete');
    }

    await pool.query(
      'UPDATE annotations SET deleted_at = NOW() WHERE id = $1',
      [annotationId]
    );

    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, document_id, action, metadata) VALUES ($1, $2, $3, $4)',
      [userId, annotation.documentId, 'annotation_delete', JSON.stringify({ annotationId })]
    );
  }

  private mapAnnotationFromDb(row: any): Annotation {
    return {
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      annotationType: row.annotation_type,
      pageNumber: row.page_number,
      crdtState: row.crdt_state,
      position: row.position,
      style: row.style,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }
}

export const annotationService = new AnnotationService();
