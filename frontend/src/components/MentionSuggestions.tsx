import { Box, VStack, Text, Avatar, HStack } from '@chakra-ui/react';
import { PresenceUser } from '../store/presence.store';

interface MentionSuggestionsProps {
  users: PresenceUser[];
  onSelectUser: (user: PresenceUser) => void;
}

export function MentionSuggestions({ users, onSelectUser }: MentionSuggestionsProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <Box
      position="absolute"
      bottom="100%"
      left={0}
      right={0}
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      boxShadow="lg"
      maxH="200px"
      overflowY="auto"
      zIndex={10}
      mb={1}
    >
      <VStack align="stretch" spacing={0}>
        {users.map((user, index) => (
          <Box
            key={user.id}
            as="button"
            onClick={() => onSelectUser(user)}
            textAlign="left"
            w="full"
            p={2}
            borderBottomWidth={index === users.length - 1 ? 0 : '1px'}
            borderColor="gray.100"
            _hover={{ bg: 'gray.50' }}
          >
            <HStack>
              <Avatar size="xs" name={user.name} src={user.avatarUrl} />
              <Text fontSize="sm">{user.name}</Text>
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
