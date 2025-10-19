import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useAnnotationStore } from '../store/annotation.store';
import { Annotation } from '../types';

async function fetchPdf(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

function drawHighlight(page: any, annotation: Annotation, scale: number) {
  const { x, y, width, height } = annotation.position;
  const color = annotation.color || '#FFEB3B'; // Default to yellow
  const r = parseInt(color.slice(1, 3), 16) / 255;
  const g = parseInt(color.slice(3, 5), 16) / 255;
  const b = parseInt(color.slice(5, 7), 16) / 255;

  page.drawRectangle({
    x: x,
    y: page.getHeight() - y - height, // pdf-lib has y-axis from bottom
    width: width,
    height: height,
    color: rgb(r, g, b),
    opacity: 0.3,
  });
}

async function drawCommentMarker(page: any, annotation: Annotation, pdfDoc: PDFDocument) {
    // For now, we just mark the location. A more advanced implementation could create a linked annotation.
    const { x, y, width, height } = annotation.position;
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText('[C]', {
        x: x,
        y: page.getHeight() - y - (height/2),
        font: helveticaFont,
        size: height * 0.8,
        color: rgb(0.12, 0.58, 0.95), // Blue
    });
}

export async function exportPdfWithAnnotations(pdfDoc: PDFDocument, originalFilename: string) {
  try {
    // 1. Flatten form fields
    const form = pdfDoc.getForm();
    form.flatten();

    // 2. Draw annotations
    const annotations = useAnnotationStore.getState().annotations;
    const pages = pdfDoc.getPages();

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageAnnotations = annotations.filter(a => a.pageNumber === i + 1);

      for (const annotation of pageAnnotations) {
        switch (annotation.type) {
          case 'highlight':
            drawHighlight(page, annotation, 1);
            break;
          case 'comment':
            await drawCommentMarker(page, annotation, pdfDoc);
            break;
          // ... other annotation types
        }
      }
    }

    // 3. Save the PDF
    const pdfBytes = await pdfDoc.save();

    // 4. Trigger download
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = originalFilename.replace('.pdf', '-filled.pdf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('Failed to export PDF. Please check the console for details.');
  }
}
