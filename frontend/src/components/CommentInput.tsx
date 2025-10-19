
import { useState } from 'react';
import { Box, Button, Textarea, useToast } from '@chakra-ui/react';
import { useCommentStore } from '../store/comment.store';

interface CommentInputProps {
  annotationId: string;
  parentId?: string;
  onCommentAdded?: () => void; // Callback to e.g. close an input box
}

export function CommentInput({ annotationId, parentId, onCommentAdded }: CommentInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addComment = useCommentStore((state) => state.addComment);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment(annotationId, content, parentId);
      setContent('');
      if (onCommentAdded) {
        onCommentAdded();
      }
      toast({
        title: 'Comment added',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error adding comment',
        description: 'Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box mt={2}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a comment... (use @ to mention)"
        size="sm"
        borderRadius="md"
      />
      <Button
        mt={2}
        size="sm"
        colorScheme="blue"
        onClick={handleSubmit}
        isLoading={isSubmitting}
        isDisabled={!content.trim()}
      >
        Submit
      </Button>
    </Box>
  );
}
