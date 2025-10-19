import { v4 as uuidv4 } from 'uuid';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PDFDocument } from 'pdf-lib';
import pool from '../config/database.js';
import { s3Client, S3_BUCKET } from '../config/s3.js';
import { generateFileChecksum } from '../utils/crypto.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import type { Document } from '../types/index.js';

export class DocumentService {
  async uploadDocument(
    userId: string,
    file: Buffer,
    filename: string,
    mimeType: string = 'application/pdf'
  ): Promise<Document> {
    // Validate file size (50MB limit)
    if (file.length > 52428800) {
      throw new ValidationError('File size exceeds 50MB limit');
    }

    // Validate MIME type
    if (mimeType !== 'application/pdf') {
      throw new ValidationError('Only PDF files are supported');
    }

    // Extract PDF metadata
    let pageCount: number | null = null;
    try {
      const pdfDoc = await PDFDocument.load(file);
      pageCount = pdfDoc.getPageCount();
    } catch (error) {
      throw new ValidationError('Invalid PDF file');
    }

    // Generate unique S3 key
    const fileId = uuidv4();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `documents/${userId}/${fileId}/${sanitizedFilename}`;

    // Generate checksum
    const checksum = generateFileChecksum(file);

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: file,
        ContentType: mimeType,
        Metadata: {
          userId,
          originalFilename: filename,
          checksum,
        },
      })
    );

    // Save metadata to database
    const result = await pool.query(
      `INSERT INTO documents (
        id, owner_id, filename, original_filename, s3_key, s3_bucket,
        file_size_bytes, page_count, mime_type, checksum_sha256
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        fileId,
        userId,
        sanitizedFilename,
        filename,
        s3Key,
        S3_BUCKET,
        file.length,
        pageCount,
        mimeType,
        checksum,
      ]
    );

    // Log audit
    await this.logAudit(userId, fileId, 'document_upload');

    return this.mapDocumentFromDb(result.rows[0]);
  }

  async getDocument(documentId: string): Promise<Document | null> {
    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL',
      [documentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Update last accessed time
    await pool.query(
      'UPDATE documents SET last_accessed_at = NOW() WHERE id = $1',
      [documentId]
    );

    return this.mapDocumentFromDb(result.rows[0]);
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    const result = await pool.query(
      `SELECT d.*
       FROM documents d
       LEFT JOIN permissions p ON d.id = p.document_id AND p.user_id = $1
       WHERE (d.owner_id = $1 OR p.id IS NOT NULL)
         AND d.deleted_at IS NULL
         AND (p.revoked_at IS NULL OR p.revoked_at IS NOT NULL)
       ORDER BY d.upload_date DESC`,
      [userId]
    );

    return result.rows.map(this.mapDocumentFromDb);
  }

  async getDocumentDownloadUrl(
    documentId: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const document = await this.getDocument(documentId);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    const command = new GetObjectCommand({
      Bucket: document.s3Bucket,
      Key: document.s3Key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  }

  async deleteDocument(documentId: string, userId: string): Promise<void> {
    // Verify ownership
    const document = await this.getDocument(documentId);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    if (document.ownerId !== userId) {
      throw new ForbiddenError('Only document owner can delete');
    }

    // Soft delete in database
    await pool.query(
      'UPDATE documents SET deleted_at = NOW() WHERE id = $1',
      [documentId]
    );

    // Delete from S3 (async, non-blocking)
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: document.s3Bucket,
          Key: document.s3Key,
        })
      );
    } catch (error) {
      console.error('Failed to delete from S3:', error);
      // Continue even if S3 deletion fails
    }

    // Log audit
    await this.logAudit(userId, documentId, 'document_delete');
  }

  async checkDocumentExists(s3Key: string): Promise<boolean> {
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  private async logAudit(
    userId: string,
    documentId: string,
    action: string
  ): Promise<void> {
    await pool.query(
      'INSERT INTO audit_logs (user_id, document_id, action) VALUES ($1, $2, $3)',
      [userId, documentId, action]
    );
  }

  private mapDocumentFromDb(row: any): Document {
    return {
      id: row.id,
      ownerId: row.owner_id,
      filename: row.filename,
      originalFilename: row.original_filename,
      s3Key: row.s3_key,
      s3Bucket: row.s3_bucket,
      fileSizeBytes: parseInt(row.file_size_bytes),
      pageCount: row.page_count,
      mimeType: row.mime_type,
      checksumSha256: row.checksum_sha256,
      uploadDate: row.upload_date,
      lastAccessedAt: row.last_accessed_at,
    };
  }
}

export const documentService = new DocumentService();
