
import { Box, CircularProgress, Flex, Heading, Text } from '@chakra-ui/react';
import { useCommentStore } from '../store/comment.store';
import { CommentThread } from './CommentThread';

export function CommentSidebar() {
  const { selectedAnnotationId, threads, isLoading, error } = useCommentStore();

  const renderContent = () => {
    if (!selectedAnnotationId) {
      return (
        <Flex justify="center" align="center" h="100%">
          <Text color="gray.500">Select an annotation to view comments.</Text>
        </Flex>
      );
    }

    if (isLoading) {
      return (
        <Flex justify="center" align="center" h="100%">
          <CircularProgress isIndeterminate />
        </Flex>
      );
    }

    if (error) {
      return (
        <Flex justify="center" align="center" h="100%">
          <Text color="red.500">{error}</Text>
        </Flex>
      );
    }

    const thread = threads[selectedAnnotationId];

    if (!thread) {
      return (
        <Flex justify="center" align="center" h="100%">
          <Text color="gray.500">No comments yet. Be the first!</Text>
        </Flex>
      );
    }

    return <CommentThread annotation={thread.annotation} comments={thread.comments} />;
  };

  return (
    <Box
      w="350px"
      h="100%"
      borderLeft="1px solid"
      borderColor="gray.200"
      bg="white"
      display="flex"
      flexDirection="column"
    >
        <Heading size="md" p={4} borderBottom="1px solid" borderColor="gray.200">
            Comments
        </Heading>
        <Box flex="1" overflowY="auto">
            {renderContent()}
        </Box>
    </Box>
  );
}
