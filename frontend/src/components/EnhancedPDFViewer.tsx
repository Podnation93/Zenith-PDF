import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Center,
  Spinner,
  Text,
  VStack,
  Button,
  HStack,
  IconButton,
  Icon,
  useToast,
} from '@chakra-ui/react';
import { FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import * as pdfjsLib from 'pdfjs-dist';
import AnnotationToolbar from './AnnotationToolbar';
import AnnotationLayer from './AnnotationLayer';
import { FormLayer } from './FormLayer';
import { useAnnotationStore } from '../store/annotation.store';
import { useTextSelection } from '../hooks/useTextSelection';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface EnhancedPDFViewerProps {
  documentId: string;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  currentPage: number;
  onPageChange?: (page: number) => void;
}

export default function EnhancedPDFViewer({
  documentId,
  pdfDoc,
  currentPage,
  onPageChange,
}: EnhancedPDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const toast = useToast();

  const {
    annotations,
    selectedTool,
    selectedColor,
    fetchAnnotations,
    createAnnotation,
    deleteAnnotation,
    setSelectedTool,
  } = useAnnotationStore();

  const { selection, clearSelection } = useTextSelection(containerRef);

  useEffect(() => {
    if (pdfDoc) {
      setNumPages(pdfDoc.numPages);
    }
  }, [pdfDoc]);

  // Load annotations
  useEffect(() => {
    if (documentId) {
      fetchAnnotations(documentId).catch((err) => {
        console.error('Failed to load annotations:', err);
      });
    }
  }, [documentId, fetchAnnotations]);

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  // Notify parent of page changes
  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage);
    }
  }, [currentPage, onPageChange]);

  // Handle text selection for highlighting
  useEffect(() => {
    if (selection && selectedTool === 'highlight') {
      handleCreateHighlight();
    }
  }, [selection, selectedTool]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTool(null);
        clearSelection();
      } else if (e.key === 'h' || e.key === 'H') {
        setSelectedTool(selectedTool === 'highlight' ? null : 'highlight');
      } else if (e.key === 'c' || e.key === 'C') {
        setSelectedTool(selectedTool === 'comment' ? null : 'comment');
      } else if (e.key === 's' || e.key === 'S') {
        setSelectedTool(selectedTool === 'sticky_note' ? null : 'sticky_note');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTool, setSelectedTool, clearSelection]);

  const handleCreateHighlight = async () => {
    if (!selection || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const selectionRect = selection.boundingRect;

    // Convert screen coordinates to PDF coordinates
    const position = {
      x: (selectionRect.left - canvasRect.left) / scale,
      y: (selectionRect.top - canvasRect.top) / scale,
      width: selectionRect.width / scale,
      height: selectionRect.height / scale,
    };

    try {
      await createAnnotation(documentId, {
        documentId,
        type: 'highlight',
        pageNumber: currentPage,
        position,
        content: selection.text,
        color: selectedColor,
        metadata: { text: selection.text },
      });

      toast({
        title: 'Highlight created',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      clearSelection();
    } catch (error) {
      toast({
        title: 'Failed to create highlight',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedTool || selectedTool === 'select' || selectedTool === 'highlight') return;
    if (!canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - canvasRect.left) / scale;
    const y = (e.clientY - canvasRect.top) / scale;

    const position = {
      x,
      y,
      width: selectedTool === 'sticky_note' ? 150 : 24,
      height: selectedTool === 'sticky_note' ? 150 : 24,
    };

    try {
      const content = selectedTool === 'comment' ? 'New comment' : 'New sticky note';

      await createAnnotation(documentId, {
        documentId,
        type: selectedTool,
        pageNumber: currentPage,
        position,
        content,
        color: selectedColor,
        metadata: {},
      });

      toast({
        title: `${selectedTool === 'comment' ? 'Comment' : 'Sticky note'} created`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      setSelectedTool(null);
    } catch (error) {
      toast({
        title: 'Failed to create annotation',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      await deleteAnnotation(documentId, annotationId);
      toast({
        title: 'Annotation deleted',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Failed to delete annotation',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const goToPreviousPage = () => {
    if (onPageChange && currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (onPageChange && currentPage < numPages) {
      onPageChange(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale(Math.min(scale + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(Math.max(scale - 0.25, 0.5));
  };

  return (
    <Box h="full" display="flex" flexDirection="column">
      {/* Annotation Toolbar */}
      <AnnotationToolbar />

      {/* PDF Controls */}
      <HStack
        spacing={4}
        p={4}
        bg="white"
        borderBottom="1px"
        borderColor="gray.200"
        justify="center"
      >
        <HStack spacing={2}>
          <IconButton
            aria-label="Previous page"
            icon={<Icon as={FiChevronLeft} />}
            onClick={goToPreviousPage}
            isDisabled={currentPage <= 1}
            size="sm"
          />
          <Text fontSize="sm" minW="100px" textAlign="center">
            Page {currentPage} of {numPages}
          </Text>
          <IconButton
            aria-label="Next page"
            icon={<Icon as={FiChevronRight} />}
            onClick={goToNextPage}
            isDisabled={currentPage >= numPages}
            size="sm"
          />
        </HStack>

        <HStack spacing={2}>
          <IconButton
            aria-label="Zoom out"
            icon={<Icon as={FiZoomOut} />}
            onClick={zoomOut}
            isDisabled={scale <= 0.5}
            size="sm"
          />
          <Text fontSize="sm" minW="60px" textAlign="center">
            {Math.round(scale * 100)}%
          </Text>
          <IconButton
            aria-label="Zoom in"
            icon={<Icon as={FiZoomIn} />}
            onClick={zoomIn}
            isDisabled={scale >= 3}
            size="sm"
          />
        </HStack>
      </HStack>

      {/* PDF Canvas with Annotations */}
      <Box
        ref={containerRef}
        flex="1"
        overflow="auto"
        bg="gray.100"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
        cursor={
          selectedTool && selectedTool !== 'select'
            ? 'crosshair'
            : 'default'
        }
      >
        <Box
          position="relative"
          bg="white"
          boxShadow="lg"
          borderRadius="md"
          overflow="hidden"
          maxW="100%"
          onClick={handleCanvasClick}
        >
          <canvas
            ref={canvasRef}
            data-page-number={currentPage}
            style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
          />

import { FormLayer } from './FormLayer';

// ...

          {/* Annotation Layer */}
          <AnnotationLayer
            annotations={annotations}
            pageNumber={currentPage}
            scale={scale}
            onDeleteAnnotation={handleDeleteAnnotation}
          />

          {/* Form Layer */}
          <FormLayer 
            pdfDoc={pdfDoc} 
            pageNumber={currentPage} 
            scale={scale} 
          />
        </Box>
      </Box>
    </Box>
  );
}
