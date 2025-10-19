import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Center, Flex, Heading, IconButton, Spinner, Text, VStack, Icon, HStack, useDisclosure, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { FiArrowLeft, FiShare2, FiDownload, FiMenu } from 'react-icons/fi';
import * as pdfjsLib from 'pdfjs-dist';
import { useAuthStore } from '../store/auth.store';
import { useDocumentStore } from '../store/document.store';
import { useCommentStore } from '../store/comment.store';
import { usePresenceStore } from '../store/presence.store';
import { useActivityStore } from '../store/activity.store';
import { usePageStore } from '../store/page.store';
import { websocketService } from '../services/websocket';
import { getCachedDocument, cacheDocument } from '../services/db';
import EnhancedPDFViewer from '../components/EnhancedPDFViewer';
import { CommentPanel } from '../components/CommentPanel';
import { PresenceAvatarGroup } from '../components/PresenceAvatarGroup';
import { exportPdfWithAnnotations } from '../services/pdfExporter';
import { SharingModal } from '../components/SharingModal';
import { ActivityFeedSidebar } from '../components/ActivityFeedSidebar';
import { PageThumbnailSidebar } from '../components/PageThumbnailSidebar';

export default function DocumentViewer() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentDocument, fetchDocument, isLoading: isDocLoading } = useDocumentStore();
  const { initializeSocketListeners: initCommentListeners } = useCommentStore();
  const { initialize: initPresenceListeners, clearPresence } = usePresenceStore();
  const { initialize: initActivityListeners } = useActivityStore();
  const { pages, initializePages } = usePageStore();
  const { isOpen: isSharingOpen, onOpen: onSharingOpen, onClose: onSharingClose } = useDisclosure();

  const [wsConnected, setWsConnected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfSrc, setPdfSrc] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isThumbSidebarOpen, setThumbSidebarOpen] = useState(false);

  useEffect(() => {
    if (!documentId) {
      navigate('/dashboard');
      return;
    }

    async function loadAndCachePdf() {
      await fetchDocument(documentId!);
      const cachedPdf = await getCachedDocument(documentId!);
      if (cachedPdf) {
        setPdfSrc(URL.createObjectURL(cachedPdf));
        return;
      }
      if (navigator.onLine) {
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/documents/${documentId}/download`;
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error('Failed to fetch PDF');
          const blob = await res.blob();
          await cacheDocument(documentId!, blob);
          setPdfSrc(URL.createObjectURL(blob));
        } catch (e) {
          setPdfSrc(url); // Fallback
        }
      }
    }

    loadAndCachePdf();
    initCommentListeners();
    initPresenceListeners();
    initActivityListeners();

    // WebSocket connection
    const token = localStorage.getItem('accessToken');
    if (token && user) {
      websocketService.connect(documentId, token, user).then(() => setWsConnected(true));
    }

    return () => {
      websocketService.disconnect();
      clearPresence();
    };
  }, [documentId, user, fetchDocument, navigate, initCommentListeners, initPresenceListeners, initActivityListeners, clearPresence]);

  useEffect(() => {
    if (!pdfSrc) return;
    const loadingTask = pdfjsLib.getDocument(pdfSrc);
    loadingTask.promise.then(pdf => {
      setPdfDoc(pdf);
      initializePages(pdf.numPages);
    });
    return () => {
      pdfDoc?.destroy();
    };
  }, [pdfSrc, initializePages]);

  const handlePageSelect = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleExport = () => {
    if (currentDocument && pdfDoc) {
      exportPdfWithAnnotations(pdfDoc, currentDocument.originalFilename);
    }
  };

  if (isDocLoading || !pdfDoc) {
    return <Center minH="100vh"><Spinner size="xl" /></Center>;
  }

  return (
    <Box h="100vh" display="flex" flexDirection="column">
      <Box bg="white" shadow="sm" borderBottom="1px" borderColor="gray.200">
        <Flex px={4} py={2} align="center" justify="space-between">
          <HStack spacing={2}>
            <IconButton icon={<FiMenu />} aria-label="Toggle Pages" onClick={() => setThumbSidebarOpen(!isThumbSidebarOpen)} />
            <IconButton icon={<FiArrowLeft />} aria-label="Back to dashboard" onClick={() => navigate('/dashboard')} />
            <Heading size="sm" noOfLines={1}>{currentDocument?.originalFilename}</Heading>
          </HStack>
          <HStack spacing={4}>
            <PresenceAvatarGroup />
            <Button leftIcon={<FiShare2 />} size="sm" onClick={onSharingOpen}>Share</Button>
            <Button leftIcon={<FiDownload />} size="sm" colorScheme="blue" onClick={handleExport}>Export</Button>
          </HStack>
        </Flex>
      </Box>

      <Flex flex="1" overflow="hidden">
        {isThumbSidebarOpen && <PageThumbnailSidebar pdfDoc={pdfDoc} onPageSelect={handlePageSelect} documentId={documentId!} />}
        
        <Box flex="1" bg="gray.100">
          <EnhancedPDFViewer
            documentId={documentId!}
            pdfDoc={pdfDoc}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </Box>

        <Box w="350px" borderLeft="1px solid" borderColor="gray.200" bg="white" display="flex" flexDirection="column">
import { useSearchStore } from '../store/search.store';
import { SearchResultsSidebar } from '../components/SearchResultsSidebar';

// ...

export default function DocumentViewer() {
  // ...
  const { query, search } = useSearchStore();

  useEffect(() => {
    if (query && pdfDoc) {
      search(pdfDoc);
    }
  }, [query, pdfDoc, search]);

  const handleSearchResultClick = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Also, we would need to highlight the result on the page.
  };

  // ...

          <Tabs isFitted variant="enclosed" h="100%" display="flex" flexDirection="column">
            <TabList>
              <Tab>Comments</Tab>
              <Tab>Activity</Tab>
              <Tab>Search</Tab>
            </TabList>
            <TabPanels flex="1" overflowY="auto">
              <TabPanel h="100%"><CommentPanel /></TabPanel>
              <TabPanel h="100%"><ActivityFeedSidebar /></TabPanel>
              <TabPanel h="100%"><SearchResultsSidebar onResultClick={handleSearchResultClick} /></TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

  // ...
}

      </Flex>

      {isSharingOpen && <SharingModal documentId={documentId!} isOpen={isSharingOpen} onClose={onSharingClose} />}
    </Box>
  );
}