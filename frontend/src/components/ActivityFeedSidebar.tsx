import React, { useMemo, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Flex,
  Avatar,
  Badge,
  Icon,
  Divider,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useColorModeValue,
  Tooltip,
  Center,
  Spinner,
} from '@chakra-ui/react';
import {
  MdEdit,
  MdComment,
  MdHighlight,
  MdDelete,
  MdPersonAdd,
  MdShare,
  MdFilterList,
  MdRefresh,
  MdCheckCircle,
  MdHistory,
} from 'react-icons/md';
import { useActivityStore, Activity } from '../store/activity.store';
import { formatDistanceToNow } from 'date-fns';

type ActivityFilter = 'all' | 'annotations' | 'comments' | 'sharing' | 'edits';

/**
 * Enhanced Activity Feed Sidebar with filtering and grouping
 */
export function ActivityFeedSidebar() {
  const { activities, isLoading, refresh } = useActivityStore();
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Filter activities based on selected filter
  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;

    return activities.filter((activity) => {
      switch (filter) {
        case 'annotations':
          return activity.type === 'annotation_created' || activity.type === 'annotation_deleted';
        case 'comments':
          return activity.type === 'comment_added' || activity.type === 'comment_resolved';
        case 'sharing':
          return activity.type === 'user_joined' || activity.type === 'permission_granted';
        case 'edits':
          return activity.type === 'annotation_updated' || activity.type === 'comment_edited';
        default:
          return true;
      }
    });
  }, [activities, filter]);

  // Group activities by day
  const groupedActivities = useMemo(() => {
    const groups: { [key: string]: Activity[] } = {};

    filteredActivities.forEach((activity) => {
      const date = new Date(activity.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(activity);
    });

    return groups;
  }, [filteredActivities]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh?.();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (isLoading) {
    return (
      <Center h="100%" p={4}>
        <VStack spacing={3}>
          <Spinner size="lg" color="blue.500" thickness="3px" />
          <Text color="gray.500" fontSize="sm">
            Loading activity...
          </Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box h="100%" display="flex" flexDirection="column" bg={bgColor}>
      {/* Header */}
      <Box
        p={4}
        borderBottom="1px"
        borderColor={borderColor}
        position="sticky"
        top={0}
        bg={bgColor}
        zIndex={1}
      >
        <HStack justify="space-between" mb={3}>
          <HStack spacing={2}>
            <Icon as={MdHistory} boxSize={5} color="blue.500" />
            <Heading size="sm">Activity Feed</Heading>
          </HStack>
          <Tooltip label="Refresh activity">
            <IconButton
              aria-label="Refresh"
              icon={<MdRefresh />}
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              isLoading={isRefreshing}
            />
          </Tooltip>
        </HStack>

        {/* Filter Menu */}
        <Menu>
          <MenuButton
            as={Button}
            size="sm"
            leftIcon={<MdFilterList />}
            variant="outline"
            width="full"
          >
            {filter === 'all' ? 'All Activity' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </MenuButton>
          <MenuList>
            <MenuItem onClick={() => setFilter('all')}>All Activity</MenuItem>
            <MenuItem onClick={() => setFilter('annotations')}>Annotations</MenuItem>
            <MenuItem onClick={() => setFilter('comments')}>Comments</MenuItem>
            <MenuItem onClick={() => setFilter('sharing')}>Sharing</MenuItem>
            <MenuItem onClick={() => setFilter('edits')}>Edits</MenuItem>
          </MenuList>
        </Menu>
      </Box>

      {/* Activity List */}
      <Box flex={1} overflowY="auto" p={4}>
        {filteredActivities.length === 0 ? (
          <Center h="200px">
            <VStack spacing={2}>
              <Icon as={MdHistory} boxSize={12} color="gray.300" />
              <Text color="gray.500" fontSize="sm" textAlign="center">
                {filter === 'all'
                  ? 'No recent activity'
                  : `No ${filter} activity`}
              </Text>
            </VStack>
          </Center>
        ) : (
          <VStack spacing={4} align="stretch">
            {Object.entries(groupedActivities).map(([date, dayActivities]) => (
              <Box key={date}>
                {/* Date Header */}
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="gray.500"
                  textTransform="uppercase"
                  mb={2}
                >
                  {date}
                </Text>

                {/* Activities for this day */}
                <VStack spacing={2} align="stretch">
                  {dayActivities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </VStack>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
}

/**
 * Individual activity item
 */
function ActivityItem({ activity }: { activity: Activity }) {
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'annotation_created':
      case 'annotation_updated':
        return MdHighlight;
      case 'annotation_deleted':
        return MdDelete;
      case 'comment_added':
      case 'comment_edited':
        return MdComment;
      case 'comment_resolved':
        return MdCheckCircle;
      case 'user_joined':
        return MdPersonAdd;
      case 'permission_granted':
        return MdShare;
      default:
        return MdEdit;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'annotation_created':
        return 'green';
      case 'annotation_updated':
        return 'blue';
      case 'annotation_deleted':
        return 'red';
      case 'comment_added':
        return 'purple';
      case 'comment_resolved':
        return 'teal';
      case 'user_joined':
      case 'permission_granted':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const iconComponent = getActivityIcon(activity.type);
  const color = getActivityColor(activity.type);

  return (
    <HStack
      spacing={3}
      p={3}
      bg={bgColor}
      borderRadius="md"
      border="1px"
      borderColor={borderColor}
      align="start"
      transition="all 0.2s"
      _hover={{ shadow: 'sm', borderColor: `${color}.300` }}
    >
      {/* Icon */}
      <Box
        p={2}
        bg={`${color}.100`}
        borderRadius="md"
        color={`${color}.600`}
        flexShrink={0}
      >
        <Icon as={iconComponent} boxSize={4} />
      </Box>

      {/* Content */}
      <VStack align="start" spacing={1} flex={1} minW={0}>
        <HStack spacing={2} flexWrap="wrap">
          <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
            {activity.userName || 'Unknown User'}
          </Text>
          {activity.type && (
            <Badge
              colorScheme={color}
              fontSize="2xs"
              textTransform="capitalize"
            >
              {activity.type.replace(/_/g, ' ')}
            </Badge>
          )}
        </HStack>

        <Text fontSize="sm" color="gray.600" noOfLines={2}>
          {activity.details}
        </Text>

        <Tooltip
          label={new Date(activity.timestamp).toLocaleString()}
          placement="top"
        >
          <Text fontSize="xs" color="gray.500">
            {formatDistanceToNow(new Date(activity.timestamp), {
              addSuffix: true,
            })}
          </Text>
        </Tooltip>
      </VStack>
    </HStack>
  );
}
