import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  Text,
  VStack,
  Spinner,
  Center,
  Icon,
  IconButton,
  useToast,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Badge,
} from '@chakra-ui/react';
import { FiFile, FiUpload, FiTrash2 } from 'react-icons/fi';
import { useAuthStore } from '../store/auth.store';
import { useDocumentStore } from '../store/document.store';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const { documents, fetchDocuments, uploadDocument, deleteDocument, isLoading } = useDocumentStore();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsUploading(true);
    try {
      const document = await uploadDocument(file);
      toast({
        title: 'Upload successful',
        description: 'Your PDF has been uploaded',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate(`/document/${document.id}`);
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload document',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDeleteClick = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentToDelete(docId);
    onOpen();
  };

  const confirmDelete = async () => {
    if (documentToDelete) {
      await deleteDocument(documentToDelete);
      toast({
        title: 'Document deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
    onClose();
    setDocumentToDelete(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bg="white" shadow="sm">
        <Container maxW="7xl" py={4}>
          <Flex justify="space-between" align="center">
            <Heading size="lg">Zenith PDF</Heading>
            <Flex align="center" gap={4}>
              <Text fontSize="sm" color="gray.600">
                {user?.firstName || user?.email}
              </Text>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Logout
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxW="7xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Flex justify="space-between" align="center">
            <Heading size="md">My Documents</Heading>
            <Button
              leftIcon={<Icon as={FiUpload} />}
              colorScheme="brand"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploading}
              loadingText="Uploading..."
            >
              Upload PDF
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={isUploading}
            />
          </Flex>

          {isLoading ? (
            <Center py={12}>
              <VStack spacing={4}>
                <Spinner size="xl" color="brand.500" thickness="4px" />
                <Text color="gray.600">Loading documents...</Text>
              </VStack>
            </Center>
          ) : documents.length === 0 ? (
            <Center py={12}>
              <Box bg="white" p={12} borderRadius="lg" textAlign="center">
                <Icon as={FiFile} boxSize={12} color="gray.400" mb={4} />
                <Heading size="sm" mb={2}>No documents</Heading>
                <Text color="gray.500">
                  Get started by uploading your first PDF document.
                </Text>
              </Box>
            </Center>
          ) : (
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
              {documents.map((doc) => (
                <Box
                  key={doc.id}
                  bg="white"
                  p={6}
                  borderRadius="lg"
                  shadow="md"
                  _hover={{ shadow: 'lg', cursor: 'pointer' }}
                  transition="all 0.2s"
                  onClick={() => navigate(`/document/${doc.id}`)}
                  role="group"
                >
                  <Flex direction="column" h="full">
                    <Flex align="start" justify="space-between" mb={4}>
                      <VStack align="start" spacing={1} flex={1} mr={2}>
                        <Heading
                          size="sm"
                          noOfLines={1}
                          _groupHover={{ color: 'brand.600' }}
                          transition="color 0.2s"
                        >
                          {doc.originalFilename}
                        </Heading>
                        <Text fontSize="sm" color="gray.500">
                          {formatFileSize(doc.fileSizeBytes)}
                          {doc.pageCount && ` • ${doc.pageCount} pages`}
                        </Text>
                      </VStack>
                    </Flex>

                    <Flex justify="space-between" align="center" mt="auto">
                      <Text fontSize="sm" color="gray.500">
                        {formatDistanceToNow(new Date(doc.uploadDate), { addSuffix: true })}
                      </Text>
                      <IconButton
                        aria-label="Delete document"
                        icon={<Icon as={FiTrash2} />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={(e) => handleDeleteClick(doc.id, e)}
                      />
                    </Flex>
                  </Flex>
                </Box>
              ))}
            </Grid>
          )}
        </VStack>
      </Container>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Document
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
