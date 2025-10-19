import { useState, useEffect, useRef } from 'react';
import { Box, Button, Textarea, useToast } from '@chakra-ui/react';
import { useCommentStore } from '../store/comment.store';
import { usePresenceStore, PresenceUser } from '../store/presence.store';
import { MentionSuggestions } from './MentionSuggestions';

interface CommentInputProps {
  annotationId: string;
  parentId?: string;
  onCommentAdded?: () => void; // Callback to e.g. close an input box
}

export function CommentInput({ annotationId, parentId, onCommentAdded }: CommentInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addComment = useCommentStore((state) => state.addComment);
  const presentUsers = usePresenceStore((state) => Object.values(state.presentUsers));
  const toast = useToast();

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectUser = (user: PresenceUser) => {
    const cursorPos = textareaRef.current?.selectionStart;
    if (cursorPos === undefined) return;

    const textBeforeCursor = content.substring(0, cursorPos);
    const textAfterCursor = content.substring(cursorPos);

    const textBeforeMention = textBeforeCursor.replace(/@\w*$/, '');
    const newContent = `${textBeforeMention}@${user.name} ${textAfterCursor}`;
    
    setContent(newContent);
    setMentionQuery(null);

    // Focus and set cursor position after the inserted mention
    setTimeout(() => {
      const newCursorPos = textBeforeMention.length + user.name.length + 2;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

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

  const filteredUsers = mentionQuery !== null 
    ? presentUsers.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : [];

  return (
    <Box mt={2} position="relative">
      {mentionQuery !== null && (
        <MentionSuggestions users={filteredUsers} onSelectUser={handleSelectUser} />
      )}
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={handleContentChange}
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
