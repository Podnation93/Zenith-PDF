import React, { useEffect, useState, useRef } from 'react';
import { Box, Text, Avatar, useColorModeValue } from '@chakra-ui/react';
import { websocketService } from '../services/websocket';
import { usePresenceStore } from '../store/presence.store';
import { useAuthStore } from '../store/auth.store';

interface CursorPosition {
  userId: string;
  page: number;
  x: number;
  y: number;
  name?: string;
  color?: string;
}

interface CursorTrackerProps {
  currentPage: number;
  containerRef: React.RefObject<HTMLElement>;
  scale?: number;
}

const CURSOR_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

/**
 * Real-time cursor tracking component
 * Displays cursors of other users viewing the same page
 */
export function CursorTracker({
  currentPage,
  containerRef,
  scale = 1,
}: CursorTrackerProps) {
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  const [localCursor, setLocalCursor] = useState<{ x: number; y: number } | null>(null);
  const throttleRef = useRef<number | null>(null);
  const { user: currentUser } = useAuthStore();
  const { presentUsers } = usePresenceStore();

  // Assign consistent colors to users
  const userColors = useRef<Record<string, string>>({});
  const getColorForUser = (userId: string): string => {
    if (!userColors.current[userId]) {
      const index = Object.keys(userColors.current).length;
      userColors.current[userId] = CURSOR_COLORS[index % CURSOR_COLORS.length];
    }
    return userColors.current[userId];
  };

  // Listen for cursor updates from other users
  useEffect(() => {
    const unsubscribe = websocketService.onMessage((message) => {
      if (message.type !== 'cursor') return;

      const { userId, payload } = message;
      const { cursorPosition } = payload;

      if (userId === currentUser?.id) return; // Ignore own cursor updates

      if (cursorPosition && cursorPosition.page === currentPage) {
        setCursors((prev) => ({
          ...prev,
          [userId]: {
            userId,
            page: cursorPosition.page,
            x: cursorPosition.x,
            y: cursorPosition.y,
            name: presentUsers[userId]?.name || 'Anonymous',
            color: getColorForUser(userId),
          },
        }));
      } else {
        // Remove cursor if user is on different page
        setCursors((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }
    });

    return unsubscribe;
  }, [currentPage, currentUser?.id, presentUsers]);

  // Track local cursor movement
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100; // Percentage
      const y = ((e.clientY - rect.top) / rect.height) * 100; // Percentage

      setLocalCursor({ x, y });

      // Throttle WebSocket updates to every 100ms
      if (throttleRef.current) return;

      throttleRef.current = window.setTimeout(() => {
        websocketService.sendCursorUpdate({
          page: currentPage,
          x,
          y,
        });
        throttleRef.current = null;
      }, 100);
    };

    const handleMouseLeave = () => {
      setLocalCursor(null);
      // Clear cursor from other users' screens
      websocketService.sendPresenceUpdate(null);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [containerRef, currentPage]);

  // Clean up cursors when page changes
  useEffect(() => {
    setCursors({});
  }, [currentPage]);

  return (
    <>
      {Object.values(cursors).map((cursor) => (
        <RemoteCursor
          key={cursor.userId}
          position={{ x: cursor.x, y: cursor.y }}
          name={cursor.name || 'Anonymous'}
          color={cursor.color || '#3B82F6'}
        />
      ))}
    </>
  );
}

interface RemoteCursorProps {
  position: { x: number; y: number };
  name: string;
  color: string;
}

function RemoteCursor({ position, name, color }: RemoteCursorProps) {
  const bgColor = useColorModeValue('white', 'gray.800');

  return (
    <Box
      position="absolute"
      left={`${position.x}%`}
      top={`${position.y}%`}
      pointerEvents="none"
      zIndex={1000}
      transition="all 0.1s ease-out"
    >
      {/* Cursor pointer */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        }}
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>

      {/* User label */}
      <Box
        position="absolute"
        left="20px"
        top="-4px"
        bg={color}
        color="white"
        px={2}
        py={1}
        borderRadius="md"
        fontSize="xs"
        fontWeight="medium"
        whiteSpace="nowrap"
        boxShadow="md"
      >
        {name}
      </Box>
    </Box>
  );
}

/**
 * Enhanced cursor tracker with user avatars
 */
export function AvatarCursorTracker({
  currentPage,
  containerRef,
  scale = 1,
}: CursorTrackerProps) {
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  const { user: currentUser } = useAuthStore();
  const { presentUsers } = usePresenceStore();

  useEffect(() => {
    const unsubscribe = websocketService.onMessage((message) => {
      if (message.type !== 'cursor') return;

      const { userId, payload } = message;
      const { cursorPosition } = payload;

      if (userId === currentUser?.id) return;

      if (cursorPosition && cursorPosition.page === currentPage) {
        const user = presentUsers[userId];
        setCursors((prev) => ({
          ...prev,
          [userId]: {
            userId,
            page: cursorPosition.page,
            x: cursorPosition.x,
            y: cursorPosition.y,
            name: user?.name || 'Anonymous',
          },
        }));
      } else {
        setCursors((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }
    });

    return unsubscribe;
  }, [currentPage, currentUser?.id, presentUsers]);

  return (
    <>
      {Object.values(cursors).map((cursor) => {
        const user = presentUsers[cursor.userId];
        return (
          <Box
            key={cursor.userId}
            position="absolute"
            left={`${cursor.x}%`}
            top={`${cursor.y}%`}
            pointerEvents="none"
            zIndex={1000}
            transition="all 0.15s ease-out"
            transform="translate(-50%, -50%)"
          >
            <Box position="relative">
              <Avatar
                name={cursor.name}
                src={user?.avatarUrl}
                size="xs"
                border="2px solid white"
                boxShadow="lg"
              />
              <Box
                position="absolute"
                bottom="-20px"
                left="50%"
                transform="translateX(-50%)"
                bg="gray.900"
                color="white"
                px={2}
                py={0.5}
                borderRadius="md"
                fontSize="2xs"
                fontWeight="medium"
                whiteSpace="nowrap"
                boxShadow="md"
                opacity={0.9}
              >
                {cursor.name}
              </Box>
            </Box>
          </Box>
        );
      })}
    </>
  );
}
