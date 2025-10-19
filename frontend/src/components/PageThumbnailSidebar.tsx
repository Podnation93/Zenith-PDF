import { useEffect, useState } from 'react';
import { Box, VStack, Text, IconButton, Center, Spinner } from '@chakra-ui/react';
import { FiTrash2 } from 'react-icons/fi';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { usePageStore } from '../store/page.store';
import * as pdfjsLib from 'pdfjs-dist';

interface PageThumbnailSidebarProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  onPageSelect: (pageNumber: number) => void;
  documentId: string;
}

function PageThumbnail({ page, index, onDelete }: { page: any, index: number, onDelete: (pageNumber: number) => void }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const renderThumbnail = async () => {
      if (!page || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const viewport = page.getViewport({ scale: 0.2 });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: ctx, viewport }).promise;
    };
    renderThumbnail();
  }, [page]);

  return (
    <Draggable draggableId={`page-${page.pageNumber}`} index={index}>
      {(provided, snapshot) => (
        <Box
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          p={2}
          mb={2}
          bg={snapshot.isDragging ? 'blue.100' : 'gray.100'}
          borderRadius="md"
          position="relative"
        >
          <canvas ref={canvasRef} style={{ width: '100%' }} />
          <Text textAlign="center" fontSize="xs">{page.pageNumber}</Text>
          <IconButton 
            icon={<FiTrash2 />} 
            size="xs" 
            aria-label="Delete page" 
            position="absolute" 
            top={1} 
            right={1} 
            onClick={() => onDelete(page.pageNumber)}
          />
        </Box>
      )}
    </Draggable>
  );
}

export function PageThumbnailSidebar({ pdfDoc, onPageSelect, documentId }: PageThumbnailSidebarProps) {
  const { pages, reorderPages, deletePage, savePageOrder, initializePages } = usePageStore();
  const [pdfPages, setPdfPages] = useState<any[]>([]);

  useEffect(() => {
    if (pdfDoc) {
      initializePages(pdfDoc.numPages);
      const pagePromises = Array.from({ length: pdfDoc.numPages }, (_, i) => pdfDoc.getPage(i + 1));
      Promise.all(pagePromises).then(setPdfPages);
    }
  }, [pdfDoc, initializePages]);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    reorderPages(result.source.index, result.destination.index);
    savePageOrder(documentId);
  };

  if (!pdfDoc) {
    return <Center h="100%"><Spinner /></Center>;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="pages">
        {(provided) => (
          <Box {...provided.droppableProps} ref={provided.innerRef} p={2} w="200px" h="100%" bg="gray.50" overflowY="auto">
            {pages.map((p, i) => {
              const pdfPage = pdfPages.find(pp => pp.pageNumber === p.pageNumber);
              return pdfPage ? <PageThumbnail key={p.pageNumber} page={pdfPage} index={i} onDelete={deletePage} /> : null;
            })}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
    </DragDropContext>
  );
}
