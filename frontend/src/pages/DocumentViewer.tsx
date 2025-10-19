import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  IconButton,
  Spinner,
  Text,
  VStack,
  Icon,
  HStack,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { FiArrowLeft, FiShare2, FiDownload } from 'react-icons/fi';
import { useAuthStore } from '../store/auth.store';
import { useDocumentStore } from '../store/document.store';
import { useCommentStore } from '../store/comment.store';
import { usePresenceStore } from '../store/presence.store';
import { useActivityStore } from '../store/activity.store';
import { websocketService } from '../services/websocket';
import EnhancedPDFViewer from '../components/EnhancedPDFViewer';
import { CommentPanel } from '../components/CommentPanel';
import { PresenceAvatarGroup } from '../components/PresenceAvatarGroup';
import { exportPdfWithAnnotations } from '../services/pdfExporter';
import { SharingModal } from '../components/SharingModal';
import { ActivityFeedSidebar } from '../components/ActivityFeedSidebar';

export default function DocumentViewer() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentDocument, fetchDocument, isLoading } = useDocumentStore();
  const { initializeSocketListeners: initCommentListeners } = useCommentStore();
  const { initialize: initPresenceListeners, clearPresence } = usePresenceStore();
  const { initialize: initActivityListeners } = useActivityStore();
  const { isOpen: isSharingOpen, onOpen: onSharingOpen, onClose: onSharingClose } = useDisclosure();
  const [wsConnected, setWsConnected] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!documentId) {
      navigate('/dashboard');
      return;
    }

    fetchDocument(documentId);
    initCommentListeners();
    initPresenceListeners();
    initActivityListeners();

    // Connect to WebSocket
    const token = localStorage.getItem('accessToken');
    if (token && user) {
      websocketService
        .connect(documentId, token, user)
        .then(() => {
          setWsConnected(true);
          console.log('WebSocket connected successfully');
        })
        .catch((error) => {
          console.error('WebSocket connection failed:', error);
        });
    }

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
      clearPresence();
    };
  }, [documentId, user, fetchDocument, navigate, initCommentListeners, initPresenceListeners, initActivityListeners, clearPresence]);

  const handleExport = () => {
    if (currentDocument) {
      const documentUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/documents/${documentId}/download`;
      exportPdfWithAnnotations(documentId!, documentUrl, currentDocument.originalFilename);
    }
  };

  const handleShare = () => {
    onSharingOpen();
  };

  if (isLoading) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" thickness="4px" />
          <Text color="gray.600">Loading document...</Text>
        </VStack>
      </Center>
    );
  }

  if (!currentDocument) {
    return (
      <Center minH="100vh">
        <VStack spacing={4}>
          <Text color="red.500" fontSize="lg">Document not found</Text>
          <Button colorScheme="brand" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </VStack>
      </Center>
    );
  }

  // Get the document URL from backend
  const documentUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/documents/${documentId}/download`;

  return (
    <Box h="100vh" display="flex" flexDirection="column">
      {/* Header */}
      <Box bg="white" shadow="sm" borderBottom="1px" borderColor="gray.200">
        <Flex px={4} py={3} align="center" justify="space-between">
          <HStack spacing={4}>
            <IconButton
              aria-label="Back to dashboard"
              icon={<Icon as={FiArrowLeft} />}
              variant="ghost"
              onClick={() => navigate('/dashboard')}
            />
            <Heading size="md" noOfLines={1}>
              {currentDocument.originalFilename}
            </Heading>
          </HStack>

          <HStack spacing={4}>
            <PresenceAvatarGroup />
            {wsConnected && (
              <HStack spacing={2}>
                <Box w={2} h={2} bg="green.500" borderRadius="full" animation="pulse 2s infinite" />
                <Text fontSize="sm" color="green.600">
                  Connected
                </Text>
              </HStack>
            )}
            <Button
              leftIcon={<Icon as={FiShare2} />}
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              Share
            </Button>
            <Button
              leftIcon={<Icon as={FiDownload} />}
              colorScheme="brand"
              size="sm"
              onClick={handleExport}
            >
              Export
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Main Content */}
      <Flex flex="1" overflow="hidden">
        {/* PDF Viewer Area */}
        <Box flex="1" bg="gray.100">
          <EnhancedPDFViewer
            documentId={documentId!}
            documentUrl={documentUrl}
            onPageChange={setCurrentPage}
          />
        </Box>

        {/* Sidebar with Tabs */}
        <Box
          w="350px"
          h="100%"
          borderLeft="1px solid"
          borderColor="gray.200"
          bg="white"
          display="flex"
          flexDirection="column"
        >
          <Tabs isFitted variant="enclosed" h="100%" display="flex" flexDirection="column">
            <TabList>
              <Tab>Comments</Tab>
              <Tab>Activity</Tab>
            </TabList>
            <TabPanels flex="1" overflowY="auto">
              <TabPanel h="100%">
                <CommentPanel />
              </TabPanel>
              <TabPanel h="100%">
                <ActivityFeedSidebar />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Flex>

      {isSharingOpen && (
        <SharingModal
          documentId={documentId!}
          isOpen={isSharingOpen}
          onClose={onSharingClose}
        />
      )}
    </Box>
  );
}
