import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Box,
  VStack,
  HStack,
  Text,
  Kbd,
  Divider,
  Grid,
  GridItem,
  useColorModeValue,
  Icon,
} from '@chakra-ui/react';
import { MdKeyboard } from 'react-icons/md';
import type { KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { formatShortcut } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: KeyboardShortcut[];
}

/**
 * Modal displaying all available keyboard shortcuts
 */
export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts = [],
}: KeyboardShortcutsModalProps) {
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Group shortcuts by category
  const groupedShortcuts = React.useMemo(() => {
    const groups: { [key: string]: KeyboardShortcut[] } = {
      Navigation: [],
      Zoom: [],
      'Annotation Tools': [],
      'Document Actions': [],
      'UI Controls': [],
    };

    shortcuts.forEach((shortcut) => {
      const desc = shortcut.description.toLowerCase();

      if (desc.includes('page')) {
        groups.Navigation.push(shortcut);
      } else if (desc.includes('zoom')) {
        groups.Zoom.push(shortcut);
      } else if (
        desc.includes('tool') ||
        desc.includes('highlight') ||
        desc.includes('comment') ||
        desc.includes('sticky') ||
        desc.includes('underline') ||
        desc.includes('strikethrough')
      ) {
        groups['Annotation Tools'].push(shortcut);
      } else if (
        desc.includes('save') ||
        desc.includes('print') ||
        desc.includes('search') ||
        desc.includes('export')
      ) {
        groups['Document Actions'].push(shortcut);
      } else {
        groups['UI Controls'].push(shortcut);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach((key) => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }, [shortcuts]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={3}>
            <Box p={2} bg="blue.50" borderRadius="md" color="blue.600">
              <Icon as={MdKeyboard} boxSize={6} />
            </Box>
            <VStack align="start" spacing={0}>
              <Text fontSize="lg" fontWeight="bold">
                Keyboard Shortcuts
              </Text>
              <Text fontSize="sm" fontWeight="normal" color="gray.600">
                Quick access to common actions
              </Text>
            </VStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={6} align="stretch">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <Box key={category}>
                <Text
                  fontWeight="bold"
                  fontSize="md"
                  mb={3}
                  color="blue.600"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  {category}
                </Text>

                <VStack spacing={2} align="stretch">
                  {categoryShortcuts.map((shortcut, index) => (
                    <ShortcutItem key={index} shortcut={shortcut} />
                  ))}
                </VStack>

                {category !== Object.keys(groupedShortcuts)[Object.keys(groupedShortcuts).length - 1] && (
                  <Divider my={4} />
                )}
              </Box>
            ))}

            {/* Tips */}
            <Box p={4} bg={bgColor} borderRadius="md" border="1px" borderColor={borderColor}>
              <Text fontWeight="semibold" mb={2} fontSize="sm">
                💡 Pro Tips
              </Text>
              <VStack align="start" spacing={1} fontSize="xs" color="gray.600">
                <Text>• Keyboard shortcuts don't work when typing in input fields</Text>
                <Text>• Press <Kbd size="sm">/</Kbd> anytime to view this dialog</Text>
                <Text>• Use <Kbd size="sm">Esc</Kbd> to cancel current action</Text>
                <Text>
                  • On Mac, <Kbd size="sm">Cmd</Kbd> replaces <Kbd size="sm">Ctrl</Kbd>
                </Text>
              </VStack>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            Got it
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/**
 * Individual shortcut item
 */
function ShortcutItem({ shortcut }: { shortcut: KeyboardShortcut }) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <HStack
      justify="space-between"
      p={3}
      bg={bgColor}
      borderRadius="md"
      border="1px"
      borderColor={borderColor}
      transition="all 0.2s"
      _hover={{ borderColor: 'blue.300', shadow: 'sm' }}
    >
      <Text fontSize="sm" flex={1}>
        {shortcut.description}
      </Text>

      <KeyboardKey shortcut={shortcut} />
    </HStack>
  );
}

/**
 * Keyboard key visualization
 */
function KeyboardKey({ shortcut }: { shortcut: KeyboardShortcut }) {
  const formatKey = (key: string): string => {
    const keyMap: { [key: string]: string } = {
      ArrowLeft: '←',
      ArrowRight: '→',
      ArrowUp: '↑',
      ArrowDown: '↓',
      Escape: 'Esc',
      ' ': 'Space',
    };

    return keyMap[key] || key.toUpperCase();
  };

  const parts: string[] = [];

  // Platform-specific modifiers
  const isMac = navigator.platform.includes('Mac');

  if (shortcut.ctrlKey || shortcut.metaKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift');
  }

  parts.push(formatKey(shortcut.key));

  return (
    <HStack spacing={1}>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          <Kbd fontSize="sm" px={2} py={1}>
            {part}
          </Kbd>
          {index < parts.length - 1 && (
            <Text fontSize="xs" color="gray.500">
              +
            </Text>
          )}
        </React.Fragment>
      ))}
    </HStack>
  );
}

/**
 * Compact shortcut hint - for inline display
 */
export function ShortcutHint({ shortcut }: { shortcut: KeyboardShortcut }) {
  return (
    <Kbd size="sm" fontSize="xs" opacity={0.7}>
      {formatShortcut(shortcut)}
    </Kbd>
  );
}
