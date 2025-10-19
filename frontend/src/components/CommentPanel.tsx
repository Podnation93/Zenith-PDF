import { CircularProgress, Flex, Text } from '@chakra-ui/react';
import { useCommentStore } from '../store/comment.store';
import { CommentThread } from './CommentThread';

export function CommentPanel() {
  const { selectedAnnotationId, threads, isLoading, error } = useCommentStore();

  if (!selectedAnnotationId) {
    return (
      <Flex justify="center" align="center" h="100%" p={4}>
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
      <Flex justify="center" align="center" h="100%" p={4}>
        <Text color="red.500">{error}</Text>
      </Flex>
    );
  }

  const thread = threads[selectedAnnotationId];

  if (!thread || thread.comments.length === 0) {
    return (
        <CommentThread annotation={thread.annotation} comments={thread.comments || []} />
    );
  }

  return <CommentThread annotation={thread.annotation} comments={thread.comments} />;
}
