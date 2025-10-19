import { Box, VStack, Text, Heading, Flex } from '@chakra-ui/react';
import { useActivityStore } from '../store/activity.store';
import { formatDistanceToNow } from 'date-fns';

export function ActivityFeedSidebar() {
  const activities = useActivityStore((state) => state.activities);

  if (activities.length === 0) {
    return (
      <Flex justify="center" align="center" h="100%" p={4}>
        <Text color="gray.500">No recent activity.</Text>
      </Flex>
    );
  }

  return (
    <Box p={4} h="100%" overflowY="auto">
      <VStack divider={<Box borderBottomWidth="1px" borderColor="gray.200" />} spacing={4} align="stretch">
        {activities.map((activity) => (
          <Box key={activity.id}>
            <Text fontSize="sm">
              <Text as="span" fontWeight="bold">{activity.userName}</Text>
              {` ${activity.details}`}
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </Text>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
