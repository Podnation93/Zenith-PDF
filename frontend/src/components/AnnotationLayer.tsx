import { Box, IconButton, Icon, Tooltip } from '@chakra-ui/react';
import { FiTrash2, FiMessageSquare } from 'react-icons/fi';
import { Annotation, useAnnotationStore } from '../store/annotation.store';

interface AnnotationLayerProps {
  annotations: Annotation[];
  pageNumber: number;
  scale: number;
  onAnnotationClick?: (annotation: Annotation) => void;
  onDeleteAnnotation?: (annotationId: string) => void;
}

export default function AnnotationLayer({
  annotations,
  pageNumber,
  scale,
  onAnnotationClick,
  onDeleteAnnotation,
}: AnnotationLayerProps) {
  const { selectedAnnotation, setSelectedAnnotation } = useAnnotationStore();

  const pageAnnotations = annotations.filter((ann) => ann.pageNumber === pageNumber);

  const handleAnnotationClick = (annotation: Annotation, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAnnotation(annotation);
    onAnnotationClick?.(annotation);
  };

  const handleDelete = (annotationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteAnnotation?.(annotationId);
  };

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      pointerEvents="none"
    >
      {pageAnnotations.map((annotation) => {
        const isSelected = selectedAnnotation?.id === annotation.id;
        const scaledPosition = {
          x: annotation.position.x * scale,
          y: annotation.position.y * scale,
          width: annotation.position.width * scale,
          height: annotation.position.height * scale,
        };

        return (
          <Box
            key={annotation.id}
            position="absolute"
            left={`${scaledPosition.x}px`}
            top={`${scaledPosition.y}px`}
            width={`${scaledPosition.width}px`}
            height={`${scaledPosition.height}px`}
            pointerEvents="auto"
            cursor="pointer"
            onClick={(e) => handleAnnotationClick(annotation, e)}
          >
            {/* Highlight Annotation */}
            {annotation.type === 'highlight' && (
              <Box
                w="full"
                h="full"
                bg={annotation.color}
                opacity={isSelected ? 0.5 : 0.3}
                _hover={{ opacity: 0.5 }}
                border={isSelected ? '2px solid' : 'none'}
                borderColor="brand.500"
                transition="all 0.2s"
                borderRadius="2px"
              />
            )}

            {/* Comment Annotation */}
            {annotation.type === 'comment' && (
              <Tooltip label={annotation.content || 'Comment'} placement="top">
                <Box
                  w="24px"
                  h="24px"
                  bg="blue.500"
                  borderRadius="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  fontSize="12px"
                  fontWeight="bold"
                  border={isSelected ? '3px solid' : '2px solid'}
                  borderColor={isSelected ? 'brand.500' : 'blue.600'}
                  _hover={{
                    transform: 'scale(1.1)',
                    boxShadow: 'lg',
                  }}
                  transition="all 0.2s"
                >
                  <Icon as={FiMessageSquare} boxSize={3} />
                </Box>
              </Tooltip>
            )}

            {/* Sticky Note Annotation */}
            {annotation.type === 'sticky_note' && (
              <Box
                w="150px"
                h="150px"
                bg="yellow.100"
                border="1px solid"
                borderColor="yellow.400"
                borderRadius="md"
                p={2}
                fontSize="xs"
                boxShadow="md"
                _hover={{
                  boxShadow: 'lg',
                  transform: 'translateY(-2px)',
                }}
                transition="all 0.2s"
                overflow="hidden"
              >
                <Box
                  fontSize="xs"
                  noOfLines={8}
                  wordBreak="break-word"
                  color="gray.800"
                >
                  {annotation.content || 'Sticky note'}
                </Box>
              </Box>
            )}

            {/* Delete button for selected annotation */}
            {isSelected && (
              <IconButton
                aria-label="Delete annotation"
                icon={<Icon as={FiTrash2} />}
                size="xs"
                colorScheme="red"
                position="absolute"
                top="-8px"
                right="-8px"
                borderRadius="full"
                onClick={(e) => handleDelete(annotation.id, e)}
                zIndex={10}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
