import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportPdfWithAnnotations, exportCommentsAsSummary } from '../../services/pdfExporter';
import { useAnnotationStore } from '../../store/annotation.store';
import { useCommentStore } from '../../store/comment.store';
import { PDFDocument } from 'pdf-lib';
import type { Annotation, Comment } from '../../types';

// Mock stores
vi.mock('../../store/annotation.store', () => ({
  useAnnotationStore: {
    getState: vi.fn(),
  },
}));

vi.mock('../../store/comment.store', () => ({
  useCommentStore: {
    getState: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Mock PDF.js
vi.mock('pdf-lib', async () => {
  const actual = await vi.importActual('pdf-lib');
  return {
    ...actual,
    PDFDocument: {
      load: vi.fn(),
      create: vi.fn(),
    },
  };
});

describe('exportPdfWithAnnotations', () => {
  let mockPdfDoc: any;
  let mockPage: any;
  let mockAnnotations: Annotation[];
  let mockComments: Comment[];

  beforeEach(() => {
    // Mock page
    mockPage = {
      getHeight: vi.fn(() => 800),
      getWidth: vi.fn(() => 600),
      drawRectangle: vi.fn(),
      drawLine: vi.fn(),
      drawText: vi.fn(),
    };

    // Mock PDF document
    mockPdfDoc = {
      getPages: vi.fn(() => [mockPage]),
      getForm: vi.fn(() => ({
        flatten: vi.fn(),
      })),
      embedFont: vi.fn(() => Promise.resolve({})),
      save: vi.fn(() => Promise.resolve(new Uint8Array())),
    };

    (PDFDocument.load as any).mockResolvedValue(mockPdfDoc);
    (PDFDocument.create as any).mockResolvedValue(mockPdfDoc);

    // Mock fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });

    // Mock annotations
    mockAnnotations = [
      {
        id: 'ann-1',
        annotationType: 'highlight',
        pageNumber: 1,
        position: { x: 100, y: 100, width: 200, height: 50 },
        style: { color: '#FFEB3B', opacity: 0.3 },
        content: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
        documentId: 'doc-1',
      },
      {
        id: 'ann-2',
        annotationType: 'underline',
        pageNumber: 1,
        position: { x: 100, y: 200, width: 200, height: 20 },
        style: { color: '#FF0000', thickness: 2 },
        content: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
        documentId: 'doc-1',
      },
    ];

    mockComments = [];

    (useAnnotationStore.getState as any).mockReturnValue({
      annotations: mockAnnotations,
    });

    (useCommentStore.getState as any).mockReturnValue({
      comments: mockComments,
    });

    // Mock DOM elements
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches PDF from URL', async () => {
    await exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf');

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/test.pdf');
  });

  it('loads PDF document with pdf-lib', async () => {
    await exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf');

    expect(PDFDocument.load).toHaveBeenCalled();
  });

  it('flattens form fields when option is enabled', async () => {
    await exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf', {
      flattenForms: true,
    });

    expect(mockPdfDoc.getForm).toHaveBeenCalled();
  });

  it('does not flatten forms when option is disabled', async () => {
    await exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf', {
      flattenForms: false,
    });

    expect(mockPdfDoc.getForm).not.toHaveBeenCalled();
  });

  it('draws highlight annotations correctly', async () => {
    await exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf');

    expect(mockPage.drawRectangle).toHaveBeenCalledWith(
      expect.objectContaining({
        opacity: 0.3,
        color: expect.anything(),
      })
    );
  });

  it('draws underline annotations correctly', async () => {
    await exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf');

    expect(mockPage.drawLine).toHaveBeenCalledWith(
      expect.objectContaining({
        thickness: 2,
        color: expect.anything(),
      })
    );
  });

  it('handles strikethrough annotations', async () => {
    (useAnnotationStore.getState as any).mockReturnValue({
      annotations: [
        {
          id: 'ann-3',
          annotationType: 'strikethrough',
          pageNumber: 1,
          position: { x: 100, y: 300, width: 200, height: 20 },
          style: { color: '#FF0000', thickness: 2 },
          content: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'user-1',
          documentId: 'doc-1',
        },
      ],
    });

    await exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf');

    expect(mockPage.drawLine).toHaveBeenCalled();
  });

  it('handles sticky note annotations', async () => {
    (useAnnotationStore.getState as any).mockReturnValue({
      annotations: [
        {
          id: 'ann-4',
          annotationType: 'sticky_note',
          pageNumber: 1,
          position: { x: 100, y: 400, width: 100, height: 100 },
          style: { color: '#FFEB3B' },
          content: 'This is a note',
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'user-1',
          documentId: 'doc-1',
        },
      ],
    });

    await exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf');

    expect(mockPage.drawRectangle).toHaveBeenCalled();
    expect(mockPage.drawText).toHaveBeenCalledWith(
      expect.stringContaining('This is a note'),
      expect.anything()
    );
  });

  it('includes comments when option is enabled', async () => {
    (useAnnotationStore.getState as any).mockReturnValue({
      annotations: [
        {
          id: 'ann-5',
          annotationType: 'comment',
          pageNumber: 1,
          position: { x: 100, y: 500, width: 0, height: 0 },
          content: 'This is a comment',
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'user-1',
          documentId: 'doc-1',
        },
      ],
    });

    await exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf', {
      includeComments: true,
    });

    expect(mockPage.drawText).toHaveBeenCalled();
  });

  it('excludes comments when option is disabled', async () => {
    (useAnnotationStore.getState as any).mockReturnValue({
      annotations: [
        {
          id: 'ann-5',
          annotationType: 'comment',
          pageNumber: 1,
          position: { x: 100, y: 500, width: 0, height: 0 },
          content: 'This is a comment',
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'user-1',
          documentId: 'doc-1',
        },
      ],
    });

    await exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf', {
      includeComments: false,
    });

    // Comment marker should not be drawn
    expect(mockPage.drawText).not.toHaveBeenCalledWith(
      expect.stringContaining('💬'),
      expect.anything()
    );
  });

  it('generates correct filename with -annotated suffix', async () => {
    await exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf');

    const createElementSpy = vi.spyOn(document, 'createElement');
    const link = createElementSpy.mock.results.find(
      (result) => result.value?.tagName === 'A'
    )?.value;

    // Check that download attribute is set correctly
    expect(link?.download).toBe('test-annotated.pdf');

    createElementSpy.mockRestore();
  });

  it('handles fetch errors gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    await expect(
      exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf')
    ).rejects.toThrow('Failed to export PDF');
  });

  it('continues exporting when individual annotation fails', async () => {
    mockPage.drawRectangle.mockImplementationOnce(() => {
      throw new Error('Draw error');
    });

    // Should not throw, should continue with other annotations
    await expect(
      exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf')
    ).resolves.not.toThrow();
  });

  it('filters annotations by page number', async () => {
    (useAnnotationStore.getState as any).mockReturnValue({
      annotations: [
        {
          id: 'ann-1',
          annotationType: 'highlight',
          pageNumber: 1,
          position: { x: 100, y: 100, width: 200, height: 50 },
          style: { color: '#FFEB3B' },
          content: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'user-1',
          documentId: 'doc-1',
        },
        {
          id: 'ann-2',
          annotationType: 'highlight',
          pageNumber: 2,
          position: { x: 100, y: 100, width: 200, height: 50 },
          style: { color: '#FFEB3B' },
          content: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'user-1',
          documentId: 'doc-1',
        },
      ],
    });

    // Only one page in document
    mockPdfDoc.getPages.mockReturnValue([mockPage]);

    await exportPdfWithAnnotations('https://example.com/test.pdf', 'test.pdf');

    // Should only draw annotations for page 1
    expect(mockPage.drawRectangle).toHaveBeenCalledTimes(1);
  });
});

describe('exportCommentsAsSummary', () => {
  let mockPdfDoc: any;
  let mockPage: any;
  let mockAnnotations: Annotation[];
  let mockComments: Comment[];

  beforeEach(() => {
    mockPage = {
      getHeight: vi.fn(() => 800),
      getWidth: vi.fn(() => 600),
      drawText: vi.fn(),
      drawRectangle: vi.fn(),
    };

    mockPdfDoc = {
      addPage: vi.fn(() => mockPage),
      embedFont: vi.fn(() => Promise.resolve({})),
      save: vi.fn(() => Promise.resolve(new Uint8Array())),
    };

    (PDFDocument.create as any).mockResolvedValue(mockPdfDoc);

    mockAnnotations = [
      {
        id: 'ann-1',
        annotationType: 'comment',
        pageNumber: 1,
        position: { x: 100, y: 100, width: 0, height: 0 },
        content: 'First comment',
        createdAt: new Date('2025-10-19T10:00:00'),
        updatedAt: new Date(),
        userId: 'user-1',
        documentId: 'doc-1',
      },
    ];

    mockComments = [
      {
        id: 'comment-1',
        annotationId: 'ann-1',
        content: 'This is a comment thread',
        authorId: 'user-1',
        createdAt: new Date('2025-10-19T10:30:00'),
        updatedAt: new Date(),
        resolved: false,
      },
    ];

    (useAnnotationStore.getState as any).mockReturnValue({
      annotations: mockAnnotations,
    });

    (useCommentStore.getState as any).mockReturnValue({
      comments: mockComments,
    });

    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates new PDF document', async () => {
    await exportCommentsAsSummary('https://example.com/test.pdf', 'test.pdf');

    expect(PDFDocument.create).toHaveBeenCalled();
  });

  it('draws title on first page', async () => {
    await exportCommentsAsSummary('https://example.com/test.pdf', 'test.pdf');

    expect(mockPage.drawText).toHaveBeenCalledWith(
      'PDF Comments Summary',
      expect.anything()
    );
  });

  it('draws document name', async () => {
    await exportCommentsAsSummary('https://example.com/test.pdf', 'test.pdf');

    expect(mockPage.drawText).toHaveBeenCalledWith(
      'Document: test.pdf',
      expect.anything()
    );
  });

  it('groups comments by page number', async () => {
    await exportCommentsAsSummary('https://example.com/test.pdf', 'test.pdf');

    expect(mockPage.drawText).toHaveBeenCalledWith(
      expect.stringContaining('Page 1'),
      expect.anything()
    );
  });

  it('draws comment content', async () => {
    await exportCommentsAsSummary('https://example.com/test.pdf', 'test.pdf');

    expect(mockPage.drawText).toHaveBeenCalledWith(
      expect.stringContaining('This is a comment thread'),
      expect.anything()
    );
  });

  it('draws author and date', async () => {
    await exportCommentsAsSummary('https://example.com/test.pdf', 'test.pdf');

    expect(mockPage.drawText).toHaveBeenCalledWith(
      expect.stringContaining('user-1'),
      expect.anything()
    );
  });

  it('generates correct filename with -comments suffix', async () => {
    await exportCommentsAsSummary('https://example.com/test.pdf', 'test.pdf');

    const createElementSpy = vi.spyOn(document, 'createElement');
    const link = createElementSpy.mock.results.find(
      (result) => result.value?.tagName === 'A'
    )?.value;

    expect(link?.download).toBe('test-comments.pdf');

    createElementSpy.mockRestore();
  });

  it('adds new page when content overflows', async () => {
    // Create many comments to trigger page overflow
    const manyComments: Comment[] = Array.from({ length: 50 }, (_, i) => ({
      id: `comment-${i}`,
      annotationId: 'ann-1',
      content: `This is comment ${i} with some content`,
      authorId: `user-${i}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      resolved: false,
    }));

    (useCommentStore.getState as any).mockReturnValue({
      comments: manyComments,
    });

    await exportCommentsAsSummary('https://example.com/test.pdf', 'test.pdf');

    // Should have added multiple pages
    expect(mockPdfDoc.addPage).toHaveBeenCalled();
  });

  it('handles empty comments gracefully', async () => {
    (useCommentStore.getState as any).mockReturnValue({
      comments: [],
    });

    await expect(
      exportCommentsAsSummary('https://example.com/test.pdf', 'test.pdf')
    ).resolves.not.toThrow();
  });

  it('handles errors gracefully', async () => {
    (PDFDocument.create as any).mockRejectedValue(new Error('PDF creation failed'));

    await expect(
      exportCommentsAsSummary('https://example.com/test.pdf', 'test.pdf')
    ).rejects.toThrow('Failed to export comments');
  });
});
