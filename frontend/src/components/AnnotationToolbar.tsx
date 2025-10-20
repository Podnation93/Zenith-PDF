import {
  Image,
} from '@chakra-ui/react';
import {
  FiEdit,
} from 'react-icons/fi';
import { useSignatureStore } from '../store/signature.store';
import { useSearchStore } from '../store/search.store';
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
  const {
    selectedTool,
    selectedColor,
    strokeWidth,
    opacity,
    setSelectedTool,
    setSelectedColor,
    setStrokeWidth,
    setOpacity,
  } = useAnnotationStore();
  const { query, setQuery, search } = useSearchStore();

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // The search action needs the pdfDoc object, which is not available here.
      // This suggests the search action should be triggered from DocumentViewer.
      // For now, we will just set the query.
    }
  };

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleToolClick = (tool: any) => {
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

import { useSignatureStore } from '../store/signature.store';


export default function AnnotationToolbar({ onOpenSignatureModal }) {
  const { signatures, deleteSignature } = useSignatureStore();


        {/* Sticky Note Tool */}

        <Divider orientation="vertical" h="30px" />

        {/* Signature Tool */}
        <Menu>
          <Tooltip label="Add Signature" placement="bottom">
            <MenuButton as={IconButton} icon={<FiEdit />} />
          </Tooltip>
          <MenuList>
            {signatures.map((sig, index) => (
              <MenuItem key={index} onClick={() => setSelectedTool('signature')}>
                <Image src={sig} h="30px" />
                <Spacer />
                <IconButton 
                  icon={<FiTrash2 />} 
                  size="xs" 
                  aria-label="Delete signature" 
                  onClick={(e) => { e.stopPropagation(); deleteSignature(index); }} 
                />
              </MenuItem>
            ))}
            <MenuItem onClick={onOpenSignatureModal}>+ Add New Signature</MenuItem>
          </MenuList>
        </Menu>

        <Divider orientation="vertical" h="30px" />

        {/* New Shape & Drawing Tools */}


        <Divider orientation="vertical" h="30px" />

        {/* Style Controls */}
        <VStack align="start" spacing={1} w="120px">
          <Text fontSize="xs">Thickness</Text>
          <Slider defaultValue={strokeWidth} min={1} max={20} step={1} onChange={(v) => setStrokeWidth(v)}>
            <SliderTrack><SliderFilledTrack /></SliderTrack>
            <SliderThumb />
          </Slider>
        </VStack>

        <VStack align="start" spacing={1} w="120px">
          <Text fontSize="xs">Opacity</Text>
          <Slider defaultValue={opacity} min={0.1} max={1} step={0.1} onChange={(v) => setOpacity(v)}>
            <SliderTrack><SliderFilledTrack /></SliderTrack>
            <SliderThumb />
          </Slider>
        </VStack>

        <Spacer />

        <InputGroup size="sm" w="250px">
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.300" />
          </InputLeftElement>
          <Input 
            placeholder="Search document..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </InputGroup>

      </HStack>
    </Box>
  );
}
