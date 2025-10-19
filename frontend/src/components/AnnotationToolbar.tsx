import {
  Box,
  HStack,
  IconButton,
  Tooltip,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  FiMousePointer,
  FiEdit3,
  FiMessageSquare,
  FiFileText,
  FiChevronDown,
} from 'react-icons/fi';
import { useAnnotationStore } from '../store/annotation.store';

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#FFEB3B' },
  { name: 'Green', value: '#4CAF50' },
  { name: 'Blue', value: '#2196F3' },
  { name: 'Red', value: '#F44336' },
  { name: 'Orange', value: '#FF9800' },
  { name: 'Purple', value: '#9C27B0' },
];

export default function AnnotationToolbar() {
  const { selectedTool, selectedColor, setSelectedTool, setSelectedColor } =
    useAnnotationStore();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleToolClick = (tool: typeof selectedTool) => {
    setSelectedTool(selectedTool === tool ? null : tool);
  };

  return (
    <Box
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      px={4}
      py={2}
      shadow="sm"
    >
      <HStack spacing={2}>
        {/* Select Tool */}
        <Tooltip label="Select (Esc)" placement="bottom">
          <IconButton
            aria-label="Select tool"
            icon={<Icon as={FiMousePointer} />}
            size="md"
            variant={selectedTool === 'select' ? 'solid' : 'ghost'}
            colorScheme={selectedTool === 'select' ? 'brand' : 'gray'}
            onClick={() => handleToolClick('select')}
          />
        </Tooltip>

        <Divider orientation="vertical" h="30px" />

        {/* Highlight Tool with Color Picker */}
        <HStack spacing={1}>
          <Tooltip label="Highlight text (H)" placement="bottom">
            <IconButton
              aria-label="Highlight tool"
              icon={<Icon as={FiEdit3} />}
              size="md"
              variant={selectedTool === 'highlight' ? 'solid' : 'ghost'}
              colorScheme={selectedTool === 'highlight' ? 'brand' : 'gray'}
              onClick={() => handleToolClick('highlight')}
            />
          </Tooltip>

          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<Icon as={FiChevronDown} />}
              size="sm"
              variant="ghost"
              px={2}
              minW="auto"
            >
              <Box
                w="20px"
                h="20px"
                borderRadius="sm"
                bg={selectedColor}
                border="1px solid"
                borderColor="gray.300"
              />
            </MenuButton>
            <MenuList minW="150px">
              {HIGHLIGHT_COLORS.map((color) => (
                <MenuItem
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  icon={
                    <Box
                      w="20px"
                      h="20px"
                      borderRadius="sm"
                      bg={color.value}
                      border="1px solid"
                      borderColor="gray.300"
                    />
                  }
                >
                  {color.name}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </HStack>

        <Divider orientation="vertical" h="30px" />

        {/* Comment Tool */}
        <Tooltip label="Add comment (C)" placement="bottom">
          <IconButton
            aria-label="Comment tool"
            icon={<Icon as={FiMessageSquare} />}
            size="md"
            variant={selectedTool === 'comment' ? 'solid' : 'ghost'}
            colorScheme={selectedTool === 'comment' ? 'brand' : 'gray'}
            onClick={() => handleToolClick('comment')}
          />
        </Tooltip>

        {/* Sticky Note Tool */}
        <Tooltip label="Sticky note (S)" placement="bottom">
          <IconButton
            aria-label="Sticky note tool"
            icon={<Icon as={FiFileText} />}
            size="md"
            variant={selectedTool === 'sticky_note' ? 'solid' : 'ghost'}
            colorScheme={selectedTool === 'sticky_note' ? 'brand' : 'gray'}
            onClick={() => handleToolClick('sticky_note')}
          />
        </Tooltip>
      </HStack>
    </Box>
  );
}
