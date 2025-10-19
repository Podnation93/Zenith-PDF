
import { Avatar, Box, Divider, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { Comment, useCommentStore } from '../store/comment.store';
import { Annotation } from '../types';
import { CommentInput } from './CommentInput';
import { formatDistanceToNow } from 'date-fns';

interface CommentThreadProps {
  annotation: Annotation;
  comments: Comment[];
}

function SingleComment({ comment }: { comment: Comment }) {
  return (
    <Flex gap={3} my={3}>
      <Avatar size="sm" name={comment.author?.name} src={comment.author?.avatarUrl} />
      <Box>
        <Flex align="center" gap={2}>
          <Text fontWeight="bold" fontSize="sm">{comment.author?.name || 'Anonymous'}</Text>
          <Text fontSize="xs" color="gray.500">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </Text>
        </Flex>
        <Text fontSize="sm" mt={1}>{comment.content}</Text>
      </Box>
    </Flex>
  );
}

export function CommentThread({ annotation, comments }: CommentThreadProps) {
  const topLevelComments = comments.filter(c => !c.parentId);

  return (
    <Box p={4}>
      <Heading size="sm" mb={2}>Discussion</Heading>
      
      {/* Original annotation content */}
      {annotation.content && (
        <Box bg="gray.50" p={3} borderRadius="md" mb={4}>
            <Text fontSize="sm" fontStyle="italic">{annotation.content}</Text>
        </Box>
      )}

      <VStack spacing={4} align="stretch">
        {topLevelComments.map(comment => (
          <SingleComment key={comment.id} comment={comment} />
        ))}
      </VStack>

      <Divider my={4} />

      <CommentInput annotationId={annotation.id} />
    </Box>
  );
}
