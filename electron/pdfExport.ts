import { PDFDocument, PDFPage, rgb, degrees, PDFFont } from 'pdf-lib';
import fs from 'fs/promises';
import Database from 'better-sqlite3';
import path from 'node:path';

/**
 * PDF Export Service for Zenith PDF
 * Handles exporting PDFs with flattened annotations
 */

export interface Annotation {
  id: string;
  annotation_type: string;
  page_number: number;
  position: string;
  style: string | null;
  content: string | null;
}

export interface ExportOptions {
  includeAnnotations?: boolean;
  includeComments?: boolean;
  flatten?: boolean;
  outputPath?: string;
}

export class PDFExportService {
  private db: Database.Database;
  private documentsPath: string;

  constructor(db: Database.Database, documentsPath: string) {
    this.db = db;
    this.documentsPath = documentsPath;
  }

  /**
   * Export a document with flattened annotations
   */
  async exportDocument(
    documentId: string,
    options: ExportOptions = {}
  ): Promise<{ success: boolean; outputPath: string }> {
    const {
      includeAnnotations = true,
      includeComments = false,
      flatten = true,
      outputPath,
    } = options;

    // Get document info
    const document = this.db
      .prepare('SELECT * FROM documents WHERE id = ?')
      .get(documentId) as any;

    if (!document) {
      throw new Error('Document not found');
    }

    // Read the PDF file
    const pdfBytes = await fs.readFile(document.file_path);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    if (includeAnnotations && flatten) {
      // Get all annotations for this document
      const annotations = this.db
        .prepare(
          'SELECT * FROM annotations WHERE document_id = ? ORDER BY page_number, created_at'
        )
        .all(documentId) as Annotation[];

      // Flatten annotations onto the PDF
      await this.flattenAnnotations(pdfDoc, annotations);
    }

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();

    // Determine output path
    const finalOutputPath =
      outputPath ||
      path.join(
        this.documentsPath,
        `${document.title.replace('.pdf', '')}_annotated_${Date.now()}.pdf`
      );

    await fs.writeFile(finalOutputPath, modifiedPdfBytes);

    return {
      success: true,
      outputPath: finalOutputPath,
    };
  }

  /**
   * Flatten annotations onto PDF pages
   */
  private async flattenAnnotations(
    pdfDoc: PDFDocument,
    annotations: Annotation[]
  ): Promise<void> {
    const pages = pdfDoc.getPages();

    // Group annotations by page
    const annotationsByPage = new Map<number, Annotation[]>();
    for (const annotation of annotations) {
      const pageAnnotations =
        annotationsByPage.get(annotation.page_number) || [];
      pageAnnotations.push(annotation);
      annotationsByPage.set(annotation.page_number, pageAnnotations);
    }

    // Process each page
    for (const [pageIndex, pageAnnotations] of annotationsByPage.entries()) {
      if (pageIndex < 0 || pageIndex >= pages.length) {
        continue;
      }

      const page = pages[pageIndex];

      for (const annotation of pageAnnotations) {
        await this.renderAnnotation(pdfDoc, page, annotation);
      }
    }
  }

  /**
   * Render a single annotation onto a PDF page
   */
  private async renderAnnotation(
    pdfDoc: PDFDocument,
    page: PDFPage,
    annotation: Annotation
  ): Promise<void> {
    const position = JSON.parse(annotation.position);
    const style = annotation.style ? JSON.parse(annotation.style) : {};

    const { width, height } = page.getSize();

    // Parse color from style
    const color = this.parseColor(style.color || '#FFFF00');
    const opacity = style.opacity !== undefined ? style.opacity : 0.3;

    switch (annotation.annotation_type) {
      case 'highlight':
        await this.renderHighlight(page, position, color, opacity, width, height);
        break;

      case 'underline':
        await this.renderUnderline(page, position, color, width, height);
        break;

      case 'strikethrough':
        await this.renderStrikethrough(page, position, color, width, height);
        break;

      case 'sticky_note':
      case 'comment':
        await this.renderStickyNote(
          pdfDoc,
          page,
          position,
          annotation.content || '',
          color,
          width,
          height
        );
        break;

      case 'drawing':
        // TODO: Implement drawing rendering
        break;
    }
  }

  /**
   * Render a highlight annotation
   */
  private async renderHighlight(
    page: PDFPage,
    position: any,
    color: [number, number, number],
    opacity: number,
    pageWidth: number,
    pageHeight: number
  ): Promise<void> {
    const x = position.x * pageWidth;
    const y = pageHeight - position.y * pageHeight; // PDF coordinates are bottom-up
    const w = position.width * pageWidth;
    const h = position.height * pageHeight;

    page.drawRectangle({
      x,
      y: y - h,
      width: w,
      height: h,
      color: rgb(color[0], color[1], color[2]),
      opacity,
    });
  }

  /**
   * Render an underline annotation
   */
  private async renderUnderline(
    page: PDFPage,
    position: any,
    color: [number, number, number],
    pageWidth: number,
    pageHeight: number
  ): Promise<void> {
    const x = position.x * pageWidth;
    const y = pageHeight - position.y * pageHeight;
    const w = position.width * pageWidth;

    page.drawLine({
      start: { x, y },
      end: { x: x + w, y },
      thickness: 1,
      color: rgb(color[0], color[1], color[2]),
    });
  }

  /**
   * Render a strikethrough annotation
   */
  private async renderStrikethrough(
    page: PDFPage,
    position: any,
    color: [number, number, number],
    pageWidth: number,
    pageHeight: number
  ): Promise<void> {
    const x = position.x * pageWidth;
    const y = pageHeight - position.y * pageHeight;
    const w = position.width * pageWidth;
    const h = position.height * pageHeight;

    page.drawLine({
      start: { x, y: y - h / 2 },
      end: { x: x + w, y: y - h / 2 },
      thickness: 1,
      color: rgb(color[0], color[1], color[2]),
    });
  }

  /**
   * Render a sticky note annotation
   */
  private async renderStickyNote(
    pdfDoc: PDFDocument,
    page: PDFPage,
    position: any,
    content: string,
    color: [number, number, number],
    pageWidth: number,
    pageHeight: number
  ): Promise<void> {
    const x = position.x * pageWidth;
    const y = pageHeight - position.y * pageHeight;

    // Draw a small icon/marker
    const iconSize = 20;
    page.drawRectangle({
      x,
      y: y - iconSize,
      width: iconSize,
      height: iconSize,
      color: rgb(color[0], color[1], color[2]),
      opacity: 0.8,
    });

    // Add text if content exists
    if (content && content.length > 0) {
      const font = await pdfDoc.embedFont('Helvetica');
      const fontSize = 8;
      const maxWidth = 150;

      // Word wrap the content
      const lines = this.wrapText(content, font, fontSize, maxWidth);

      let textY = y - iconSize - 5;
      for (const line of lines.slice(0, 3)) {
        // Limit to 3 lines
        page.drawText(line, {
          x: x + iconSize + 5,
          y: textY,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
        textY -= fontSize + 2;
      }
    }
  }

  /**
   * Parse hex color to RGB
   */
  private parseColor(hexColor: string): [number, number, number] {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return [r, g, b];
  }

  /**
   * Wrap text to fit within a maximum width
   */
  private wrapText(
    text: string,
    font: PDFFont,
    fontSize: number,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Export annotations summary as a separate document
   */
  async exportAnnotationsSummary(
    documentId: string,
    outputPath?: string
  ): Promise<{ success: boolean; outputPath: string }> {
    // Get document info
    const document = this.db
      .prepare('SELECT * FROM documents WHERE id = ?')
      .get(documentId) as any;

    if (!document) {
      throw new Error('Document not found');
    }

    // Get all annotations with user info
    const annotations = this.db
      .prepare(
        `
        SELECT a.*, u.email, u.first_name, u.last_name
        FROM annotations a
        JOIN users u ON a.user_id = u.id
        WHERE a.document_id = ?
        ORDER BY a.page_number, a.created_at
      `
      )
      .all(documentId) as any[];

    // Create a new PDF for the summary
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont('Helvetica');
    const boldFont = await pdfDoc.embedFont('Helvetica-Bold');

    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 12;
    const margin = 50;
    let y = height - margin;

    // Title
    page.drawText('Annotations Summary', {
      x: margin,
      y,
      size: 18,
      font: boldFont,
    });
    y -= 30;

    page.drawText(`Document: ${document.title}`, {
      x: margin,
      y,
      size: fontSize,
      font,
    });
    y -= 20;

    page.drawText(`Total Annotations: ${annotations.length}`, {
      x: margin,
      y,
      size: fontSize,
      font,
    });
    y -= 30;

    // List each annotation
    for (const annotation of annotations) {
      // Check if we need a new page
      if (y < margin + 100) {
        page = pdfDoc.addPage();
        y = height - margin;
      }

      const userName = `${annotation.first_name || ''} ${
        annotation.last_name || ''
      }`.trim() || annotation.email;

      page.drawText(
        `Page ${annotation.page_number + 1} - ${
          annotation.annotation_type
        } by ${userName}`,
        {
          x: margin,
          y,
          size: 10,
          font: boldFont,
        }
      );
      y -= 15;

      if (annotation.content) {
        const lines = this.wrapText(
          annotation.content,
          font,
          9,
          width - 2 * margin
        );
        for (const line of lines) {
          if (y < margin + 50) {
            page = pdfDoc.addPage();
            y = height - margin;
          }
          page.drawText(line, {
            x: margin + 10,
            y,
            size: 9,
            font,
          });
          y -= 12;
        }
      }

      y -= 10;
    }

    // Save the summary PDF
    const summaryBytes = await pdfDoc.save();

    const finalOutputPath =
      outputPath ||
      path.join(
        this.documentsPath,
        `${document.title.replace('.pdf', '')}_annotations_summary_${Date.now()}.pdf`
      );

    await fs.writeFile(finalOutputPath, summaryBytes);

    return {
      success: true,
      outputPath: finalOutputPath,
    };
  }
}
