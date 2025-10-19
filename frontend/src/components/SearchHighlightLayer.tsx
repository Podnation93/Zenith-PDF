import { Box } from '@chakra-ui/react';
import { useSearchStore } from '../store/search.store';

interface SearchHighlightLayerProps {
  pageNumber: number;
  scale: number;
}

export function SearchHighlightLayer({ pageNumber, scale }: SearchHighlightLayerProps) {
  const { results, activeResultIndex } = useSearchStore();

  const pageResults = results.filter(r => r.pageNumber === pageNumber);

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      pointerEvents="none"
    >
      {pageResults.map((result, index) => {
        const isActive = results.findIndex(r => r === result) === activeResultIndex;
        const scaledPosition = {
          x: result.position.x * scale,
          y: result.position.y * scale,
          width: result.position.width * scale,
          height: result.position.height * scale,
        };

        return (
          <Box
            key={index}
            position="absolute"
            left={`${scaledPosition.x}px`}
            top={`${scaledPosition.y}px`}
            width={`${scaledPosition.width}px`}
            height={`${scaledPosition.height}px`}
            bg={isActive ? 'orange.300' : 'yellow.300'}
            opacity={0.4}
            zIndex={isActive ? 2 : 1}
            border={isActive ? '2px solid orange' : 'none'}
          />
        );
      })}
    </Box>
  );
}
