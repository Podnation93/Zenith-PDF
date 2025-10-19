import { PDFDocument, rgb, StandardFonts, PDFPage, degrees } from 'pdf-lib';
import { useAnnotationStore } from '../store/annotation.store';
import { useCommentStore } from '../store/comment.store';
import type { Annotation, Comment } from '../types';

/**
 * Fetch PDF from URL
 */
async function fetchPdf(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

/**
 * Parse hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.slice(0, 2), 16) / 255,
    g: parseInt(cleanHex.slice(2, 4), 16) / 255,
    b: parseInt(cleanHex.slice(4, 6), 16) / 255,
  };
}

/**
 * Draw highlight annotation
 */
function drawHighlight(page: PDFPage, annotation: Annotation) {
  const { x, y, width, height } = annotation.position;
  const color = hexToRgb(annotation.style?.color || '#FFEB3B');
  const opacity = annotation.style?.opacity ?? 0.3;

  page.drawRectangle({
    x,
    y: page.getHeight() - y - height,
    width,
    height,
    color: rgb(color.r, color.g, color.b),
    opacity,
  });
}

/**
 * Draw underline annotation
 */
function drawUnderline(page: PDFPage, annotation: Annotation) {
  const { x, y, width, height } = annotation.position;
  const color = hexToRgb(annotation.style?.color || '#FF0000');
  const thickness = annotation.style?.thickness || 2;

  page.drawLine({
    start: { x, y: page.getHeight() - y - height },
    end: { x: x + width, y: page.getHeight() - y - height },
    thickness,
    color: rgb(color.r, color.g, color.b),
  });
}

/**
 * Draw strikethrough annotation
 */
function drawStrikethrough(page: PDFPage, annotation: Annotation) {
  const { x, y, width, height } = annotation.position;
  const color = hexToRgb(annotation.style?.color || '#FF0000');
  const thickness = annotation.style?.thickness || 2;

  const middleY = page.getHeight() - y - height / 2;

  page.drawLine({
    start: { x, y: middleY },
    end: { x: x + width, y: middleY },
    thickness,
    color: rgb(color.r, color.g, color.b),
  });
}

/**
 * Draw comment marker
 */
async function drawCommentMarker(
  page: PDFPage,
  annotation: Annotation,
  pdfDoc: PDFDocument,
  comments: Comment[]
) {
  const { x, y } = annotation.position;
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;

  // Draw comment icon
  page.drawText('💬', {
    x,
    y: page.getHeight() - y - fontSize,
    size: fontSize,
  });

  // If there are comments, draw them nearby
  const annotationComments = comments.filter(
    (c) => c.annotationId === annotation.id
  );

  if (annotationComments.length > 0 && annotation.content) {
    const textX = x + 20;
    const textY = page.getHeight() - y - fontSize;

    // Draw comment bubble
    const maxWidth = page.getWidth() - textX - 20;
    const lines = wrapText(annotation.content, maxWidth, fontSize - 2);

    const bubbleHeight = (lines.length + 1) * (fontSize - 2) + 10;
    const bubbleWidth = Math.min(maxWidth, 200);

    // Background
    page.drawRectangle({
      x: textX - 5,
      y: textY - bubbleHeight + fontSize,
      width: bubbleWidth,
      height: bubbleHeight,
      color: rgb(1, 1, 0.9),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    // Comment text
    let currentY = textY - fontSize + 5;
    for (const line of lines) {
      page.drawText(line, {
        x: textX,
        y: currentY,
        size: fontSize - 2,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2),
        maxWidth: bubbleWidth - 10,
      });
      currentY -= fontSize - 2;
    }
  }
}

/**
 * Draw sticky note annotation
 */
async function drawStickyNote(
  page: PDFPage,
  annotation: Annotation,
  pdfDoc: PDFDocument
) {
  const { x, y, width = 100, height = 100 } = annotation.position;
  const color = hexToRgb(annotation.style?.color || '#FFEB3B');
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Draw sticky note background
  page.drawRectangle({
    x,
    y: page.getHeight() - y - height,
    width,
    height,
    color: rgb(color.r, color.g, color.b),
    opacity: 0.8,
    borderColor: rgb(color.r * 0.8, color.g * 0.8, color.b * 0.8),
    borderWidth: 1,
  });

  // Draw content if available
  if (annotation.content) {
    const fontSize = 10;
    const lines = wrapText(annotation.content, width - 10, fontSize);

    let currentY = page.getHeight() - y - 15;
    for (const line of lines.slice(0, Math.floor((height - 20) / fontSize))) {
      page.drawText(line, {
        x: x + 5,
        y: currentY,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2),
        maxWidth: width - 10,
      });
      currentY -= fontSize + 2;
    }
  }
}

/**
 * Wrap text to fit within a maximum width
 */
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  const approxCharWidth = fontSize * 0.6;
  const maxChars = Math.floor(maxWidth / approxCharWidth);

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxChars) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Export PDF with all annotations flattened
 * @param pdfUrl - URL to the PDF document
 * @param filename - Original filename
 * @param options - Export options
 */
export async function exportPdfWithAnnotations(
  pdfUrl: string,
  filename: string,
  options: {
    includeComments?: boolean;
    flattenForms?: boolean;
  } = {}
): Promise<void> {
  const { includeComments = true, flattenForms = true } = options;

  try {
    // 1. Fetch and load PDF
    const pdfBytes = await fetchPdf(pdfUrl);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // 2. Flatten form fields if requested
    if (flattenForms) {
      try {
        const form = pdfDoc.getForm();
        form.flatten();
      } catch (error) {
        console.warn('No form fields to flatten or error flattening:', error);
      }
    }

    // 3. Get annotations and comments from stores
    const annotations = useAnnotationStore.getState().annotations;
    const comments = includeComments ? useCommentStore.getState().comments : [];
    const pages = pdfDoc.getPages();

    // 4. Draw annotations on each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageNum = i + 1;
      const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNum);

      // Sort annotations by type (background elements first)
      const sortedAnnotations = pageAnnotations.sort((a, b) => {
        const order = { highlight: 0, underline: 1, strikethrough: 2, sticky_note: 3, comment: 4 };
        return (order[a.annotationType as keyof typeof order] || 99) -
               (order[b.annotationType as keyof typeof order] || 99);
      });

      for (const annotation of sortedAnnotations) {
        try {
          switch (annotation.annotationType) {
            case 'highlight':
              drawHighlight(page, annotation);
              break;
            case 'underline':
              drawUnderline(page, annotation);
              break;
            case 'strikethrough':
              drawStrikethrough(page, annotation);
              break;
            case 'sticky_note':
              await drawStickyNote(page, annotation, pdfDoc);
              break;
            case 'comment':
              if (includeComments) {
                await drawCommentMarker(page, annotation, pdfDoc, comments);
              }
              break;
            default:
              console.warn(`Unsupported annotation type: ${annotation.annotationType}`);
          }
        } catch (error) {
          console.error(`Failed to draw annotation ${annotation.id}:`, error);
          // Continue with other annotations
        }
      }
    }

    // 5. Save the PDF
    const modifiedPdfBytes = await pdfDoc.save();

    // 6. Trigger download
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    // Generate filename with annotations suffix
    const baseName = filename.replace(/\.pdf$/i, '');
    link.download = `${baseName}-annotated.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Failed to export PDF with annotations:', error);
    throw new Error('Failed to export PDF. Please try again.');
  }
}

/**
 * Export only comments as a separate PDF summary
 * @param pdfUrl - URL to the PDF document
 * @param filename - Original filename
 */
export async function exportCommentsAsSummary(
  pdfUrl: string,
  filename: string
): Promise<void> {
  try {
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const comments = useCommentStore.getState().comments;
    const annotations = useAnnotationStore.getState().annotations;

    let page = pdfDoc.addPage();
    let yPosition = page.getHeight() - 50;

    // Title
    page.drawText('PDF Comments Summary', {
      x: 50,
      y: yPosition,
      size: 18,
      font: helveticaBoldFont,
    });

    yPosition -= 30;

    // Document name
    page.drawText(`Document: ${filename}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    yPosition -= 40;

    // Group comments by page
    const commentsByPage = new Map<number, (Comment & { annotation?: Annotation })[]>();

    comments.forEach((comment) => {
      const annotation = annotations.find((a) => a.id === comment.annotationId);
      const pageNum = annotation?.pageNumber || 0;

      if (!commentsByPage.has(pageNum)) {
        commentsByPage.set(pageNum, []);
      }

      commentsByPage.get(pageNum)!.push({ ...comment, annotation });
    });

    // Draw comments for each page
    for (const [pageNum, pageComments] of Array.from(commentsByPage.entries()).sort(
      ([a], [b]) => a - b
    )) {
      // Check if we need a new page
      if (yPosition < 100) {
        page = pdfDoc.addPage();
        yPosition = page.getHeight() - 50;
      }

      // Page header
      page.drawText(`Page ${pageNum}`, {
        x: 50,
        y: yPosition,
        size: 14,
        font: helveticaBoldFont,
      });

      yPosition -= 25;

      // Draw each comment
      for (const comment of pageComments) {
        if (yPosition < 100) {
          page = pdfDoc.addPage();
          yPosition = page.getHeight() - 50;
        }

        // Author and date
        const date = new Date(comment.createdAt).toLocaleDateString();
        page.drawText(`${comment.authorId} - ${date}`, {
          x: 60,
          y: yPosition,
          size: 10,
          font: helveticaBoldFont,
        });

        yPosition -= 15;

        // Comment content
        const lines = wrapText(comment.content, page.getWidth() - 120, 10);
        for (const line of lines) {
          if (yPosition < 50) {
            page = pdfDoc.addPage();
            yPosition = page.getHeight() - 50;
          }

          page.drawText(line, {
            x: 60,
            y: yPosition,
            size: 10,
            font: helveticaFont,
          });

          yPosition -= 12;
        }

        yPosition -= 10; // Space between comments
      }

      yPosition -= 20; // Space between pages
    }

    // Save and download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    const baseName = filename.replace(/\.pdf$/i, '');
    link.download = `${baseName}-comments.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Failed to export comments summary:', error);
    throw new Error('Failed to export comments. Please try again.');
  }
}
