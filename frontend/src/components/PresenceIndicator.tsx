import React from 'react';
import {
  HStack,
  Avatar,
  AvatarGroup,
  Box,
  Text,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  VStack,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { MdCircle } from 'react-icons/md';
import { usePresenceStore } from '../store/presence.store';
import { useAuthStore } from '../store/auth.store';

interface PresenceIndicatorProps {
  maxAvatars?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showNames?: boolean;
}

/**
 * Real-time presence indicator showing active users in the document
 */
export function PresenceIndicator({
  maxAvatars = 5,
  size = 'sm',
  showNames = false,
}: PresenceIndicatorProps) {
  const { presentUsers } = usePresenceStore();
  const { user: currentUser } = useAuthStore();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Filter out current user from presence list
  const otherUsers = Object.values(presentUsers).filter(
    (user) => user.id !== currentUser?.id
  );

  const totalUsers = otherUsers.length;

  if (totalUsers === 0) {
    return null;
  }

  return (
    <Box
      bg={bgColor}
      border="1px"
      borderColor={borderColor}
      borderRadius="full"
      px={3}
      py={1}
      shadow="sm"
    >
      <HStack spacing={2}>
        {showNames && (
          <Text fontSize="sm" fontWeight="medium" color="gray.600">
            {totalUsers === 1
              ? '1 viewer'
              : `${totalUsers} viewers`}
          </Text>
        )}

        <AvatarGroup size={size} max={maxAvatars} spacing="-0.5rem">
          {otherUsers.map((user) => (
            <Tooltip
              key={user.id}
              label={user.name || 'Anonymous'}
              placement="bottom"
              hasArrow
            >
              <Avatar
                name={user.name || 'Anonymous'}
                src={user.avatarUrl}
                border="2px solid white"
                showBorder
              />
            </Tooltip>
          ))}
        </AvatarGroup>

        {totalUsers > maxAvatars && (
          <Popover placement="bottom-end">
            <PopoverTrigger>
              <Badge
                colorScheme="blue"
                cursor="pointer"
                borderRadius="full"
                px={2}
                fontSize="xs"
              >
                +{totalUsers - maxAvatars}
              </Badge>
            </PopoverTrigger>
            <PopoverContent width="250px">
              <PopoverBody>
                <VStack align="stretch" spacing={2}>
                  <Text fontWeight="bold" fontSize="sm">
                    All Viewers ({totalUsers})
                  </Text>
                  {otherUsers.map((user) => (
                    <HStack key={user.id} spacing={3}>
                      <Avatar
                        name={user.name || 'Anonymous'}
                        src={user.avatarUrl}
                        size="sm"
                      />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          {user.name || 'Anonymous'}
                        </Text>
                        <HStack spacing={1} fontSize="xs" color="green.500">
                          <MdCircle size={8} />
                          <Text>Active</Text>
                        </HStack>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        )}
      </HStack>
    </Box>
  );
}

/**
 * Simple presence count badge
 */
export function PresenceCount() {
  const { presentUsers } = usePresenceStore();
  const { user: currentUser } = useAuthStore();

  const otherUsers = Object.values(presentUsers).filter(
    (user) => user.id !== currentUser?.id
  );

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <Badge
      colorScheme="green"
      borderRadius="full"
      px={2}
      py={1}
      fontSize="xs"
      display="flex"
      alignItems="center"
      gap={1}
    >
      <MdCircle size={8} />
      {otherUsers.length} online
    </Badge>
  );
}

/**
 * Active user list for sidebars
 */
export function ActiveUserList() {
  const { presentUsers } = usePresenceStore();
  const { user: currentUser } = useAuthStore();

  const otherUsers = Object.values(presentUsers).filter(
    (user) => user.id !== currentUser?.id
  );

  if (otherUsers.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Text fontSize="sm" color="gray.500">
          No other users viewing
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={3} p={4}>
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        Active Users ({otherUsers.length})
      </Text>
      {otherUsers.map((user) => (
        <HStack key={user.id} spacing={3}>
          <Box position="relative">
            <Avatar
              name={user.name || 'Anonymous'}
              src={user.avatarUrl}
              size="sm"
            />
            <Box
              position="absolute"
              bottom={0}
              right={0}
              width="10px"
              height="10px"
              bg="green.400"
              border="2px solid white"
              borderRadius="full"
            />
          </Box>
          <VStack align="start" spacing={0} flex={1}>
            <Text fontSize="sm" fontWeight="medium">
              {user.name || 'Anonymous'}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Viewing document
            </Text>
          </VStack>
        </HStack>
      ))}
    </VStack>
  );
}
