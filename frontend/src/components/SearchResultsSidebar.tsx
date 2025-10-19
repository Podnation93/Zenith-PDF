import { Box, VStack, Text, Spinner, Center, Button } from '@chakra-ui/react';
import { useSearchStore } from '../store/search.store';

interface SearchResultsSidebarProps {
  onResultClick: (pageNumber: number) => void;
}

export function SearchResultsSidebar({ onResultClick }: SearchResultsSidebarProps) {
  const { results, isSearching, query } = useSearchStore();

  if (isSearching) {
    return <Center h="100%"><Spinner /></Center>;
  }

  if (query && results.length === 0) {
    return <Center h="100%"><Text>No results found for "{query}"</Text></Center>;
  }

  return (
    <Box p={4} h="100%" overflowY="auto">
      <VStack spacing={4} align="stretch">
        {results.map((result, index) => (
          <Button 
            key={index} 
            variant="outline" 
            onClick={() => onResultClick(result.pageNumber)}
            justifyContent="flex-start"
            h="auto"
            p={2}
          >
            <VStack align="stretch">
              <Text fontSize="sm" fontWeight="bold">Page {result.pageNumber}</Text>
              <Text fontSize="xs" noOfLines={2}>...{result.match}...</Text>
            </VStack>
          </Button>
        ))}
      </VStack>
    </Box>
  );
}
