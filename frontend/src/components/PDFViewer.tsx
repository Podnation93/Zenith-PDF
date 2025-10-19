import { useEffect, useRef, useState } from 'react';
import { Box, Center, Spinner, Text, VStack, Button, HStack, IconButton, Icon } from '@chakra-ui/react';
import { FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  documentUrl: string;
  onPageChange?: (page: number) => void;
}

export default function PDFViewer({ documentUrl, onPageChange }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // Load PDF document
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadingTask = pdfjsLib.getDocument(documentUrl);
        const pdf = await loadingTask.promise;

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF document');
        setIsLoading(false);
      }
    };

    if (documentUrl) {
      loadPDF();
    }

    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [documentUrl]);

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        // Cancel previous render task if it exists
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

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale(Math.min(scale + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(Math.max(scale - 0.25, 0.5));
  };

  if (isLoading) {
    return (
      <Center h="full">
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" thickness="4px" />
          <Text color="gray.600">Loading PDF...</Text>
        </VStack>
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="full">
        <VStack spacing={4}>
          <Text color="red.500" fontSize="lg">{error}</Text>
          <Button colorScheme="brand" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </VStack>
      </Center>
    );
  }

  return (
    <Box h="full" display="flex" flexDirection="column">
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

      {/* PDF Canvas */}
      <Box
        flex="1"
        overflow="auto"
        bg="gray.100"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
      >
        <Box
          bg="white"
          boxShadow="lg"
          borderRadius="md"
          overflow="hidden"
          maxW="100%"
        >
          <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
        </Box>
      </Box>
    </Box>
  );
}
