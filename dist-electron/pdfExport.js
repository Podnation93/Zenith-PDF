"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFExportService = void 0;
const pdf_lib_1 = require("pdf-lib");
const promises_1 = __importDefault(require("fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
class PDFExportService {
    constructor(db, documentsPath) {
        this.db = db;
        this.documentsPath = documentsPath;
    }
    /**
     * Export a document with flattened annotations
     */
    async exportDocument(documentId, options = {}) {
        const { includeAnnotations = true, includeComments = false, flatten = true, outputPath, } = options;
        // Get document info
        const document = this.db
            .prepare('SELECT * FROM documents WHERE id = ?')
            .get(documentId);
        if (!document) {
            throw new Error('Document not found');
        }
        // Read the PDF file
        const pdfBytes = await promises_1.default.readFile(document.file_path);
        const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBytes);
        if (includeAnnotations && flatten) {
            // Get all annotations for this document
            const annotations = this.db
                .prepare('SELECT * FROM annotations WHERE document_id = ? ORDER BY page_number, created_at')
                .all(documentId);
            // Flatten annotations onto the PDF
            await this.flattenAnnotations(pdfDoc, annotations);
        }
        // Save the modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        // Determine output path
        const finalOutputPath = outputPath ||
            node_path_1.default.join(this.documentsPath, `${document.title.replace('.pdf', '')}_annotated_${Date.now()}.pdf`);
        await promises_1.default.writeFile(finalOutputPath, modifiedPdfBytes);
        return {
            success: true,
            outputPath: finalOutputPath,
        };
    }
    /**
     * Flatten annotations onto PDF pages
     */
    async flattenAnnotations(pdfDoc, annotations) {
        const pages = pdfDoc.getPages();
        // Group annotations by page
        const annotationsByPage = new Map();
        for (const annotation of annotations) {
            const pageAnnotations = annotationsByPage.get(annotation.page_number) || [];
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
    async renderAnnotation(pdfDoc, page, annotation) {
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
                await this.renderStickyNote(pdfDoc, page, position, annotation.content || '', color, width, height);
                break;
            case 'drawing':
                // TODO: Implement drawing rendering
                break;
        }
    }
    /**
     * Render a highlight annotation
     */
    async renderHighlight(page, position, color, opacity, pageWidth, pageHeight) {
        const x = position.x * pageWidth;
        const y = pageHeight - position.y * pageHeight; // PDF coordinates are bottom-up
        const w = position.width * pageWidth;
        const h = position.height * pageHeight;
        page.drawRectangle({
            x,
            y: y - h,
            width: w,
            height: h,
            color: (0, pdf_lib_1.rgb)(color[0], color[1], color[2]),
            opacity,
        });
    }
    /**
     * Render an underline annotation
     */
    async renderUnderline(page, position, color, pageWidth, pageHeight) {
        const x = position.x * pageWidth;
        const y = pageHeight - position.y * pageHeight;
        const w = position.width * pageWidth;
        page.drawLine({
            start: { x, y },
            end: { x: x + w, y },
            thickness: 1,
            color: (0, pdf_lib_1.rgb)(color[0], color[1], color[2]),
        });
    }
    /**
     * Render a strikethrough annotation
     */
    async renderStrikethrough(page, position, color, pageWidth, pageHeight) {
        const x = position.x * pageWidth;
        const y = pageHeight - position.y * pageHeight;
        const w = position.width * pageWidth;
        const h = position.height * pageHeight;
        page.drawLine({
            start: { x, y: y - h / 2 },
            end: { x: x + w, y: y - h / 2 },
            thickness: 1,
            color: (0, pdf_lib_1.rgb)(color[0], color[1], color[2]),
        });
    }
    /**
     * Render a sticky note annotation
     */
    async renderStickyNote(pdfDoc, page, position, content, color, pageWidth, pageHeight) {
        const x = position.x * pageWidth;
        const y = pageHeight - position.y * pageHeight;
        // Draw a small icon/marker
        const iconSize = 20;
        page.drawRectangle({
            x,
            y: y - iconSize,
            width: iconSize,
            height: iconSize,
            color: (0, pdf_lib_1.rgb)(color[0], color[1], color[2]),
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
                    color: (0, pdf_lib_1.rgb)(0, 0, 0),
                });
                textY -= fontSize + 2;
            }
        }
    }
    /**
     * Parse hex color to RGB
     */
    parseColor(hexColor) {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        return [r, g, b];
    }
    /**
     * Wrap text to fit within a maximum width
     */
    wrapText(text, font, fontSize, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);
            if (testWidth > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            }
            else {
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
    async exportAnnotationsSummary(documentId, outputPath) {
        // Get document info
        const document = this.db
            .prepare('SELECT * FROM documents WHERE id = ?')
            .get(documentId);
        if (!document) {
            throw new Error('Document not found');
        }
        // Get all annotations with user info
        const annotations = this.db
            .prepare(`
        SELECT a.*, u.email, u.first_name, u.last_name
        FROM annotations a
        JOIN users u ON a.user_id = u.id
        WHERE a.document_id = ?
        ORDER BY a.page_number, a.created_at
      `)
            .all(documentId);
        // Create a new PDF for the summary
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
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
            const userName = `${annotation.first_name || ''} ${annotation.last_name || ''}`.trim() || annotation.email;
            page.drawText(`Page ${annotation.page_number + 1} - ${annotation.annotation_type} by ${userName}`, {
                x: margin,
                y,
                size: 10,
                font: boldFont,
            });
            y -= 15;
            if (annotation.content) {
                const lines = this.wrapText(annotation.content, font, 9, width - 2 * margin);
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
        const finalOutputPath = outputPath ||
            node_path_1.default.join(this.documentsPath, `${document.title.replace('.pdf', '')}_annotations_summary_${Date.now()}.pdf`);
        await promises_1.default.writeFile(finalOutputPath, summaryBytes);
        return {
            success: true,
            outputPath: finalOutputPath,
        };
    }
}
exports.PDFExportService = PDFExportService;
