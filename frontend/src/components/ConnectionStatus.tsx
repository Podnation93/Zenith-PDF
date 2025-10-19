import React, { useState, useEffect } from 'react';
import {
  Box,
  HStack,
  Text,
  Badge,
  Icon,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  useColorModeValue,
  ScaleFade,
  Collapse,
} from '@chakra-ui/react';
import {
  MdWifi,
  MdWifiOff,
  MdSync,
  MdSyncDisabled,
  MdCheckCircle,
  MdWarning,
  MdCloudOff,
  MdCloudDone,
} from 'react-icons/md';
import { websocketService } from '../services/websocket';
import { isOnline } from '../utils/apiRetry';

type ConnectionState = 'online' | 'offline' | 'connecting' | 'syncing';

/**
 * Connection Status Banner - Shows at top of page when offline
 */
export function ConnectionStatusBanner() {
  const [status, setStatus] = useState<ConnectionState>('online');
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setStatus('online');
      setTimeout(() => setShow(false), 3000); // Hide after 3 seconds
    };

    const handleOffline = () => {
      setStatus('offline');
      setShow(true);
    };

    // Initial check
    setStatus(isOnline() ? 'online' : 'offline');
    setShow(!isOnline());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!show && status === 'online') {
    return null;
  }

  return (
    <ScaleFade initialScale={0.9} in={show}>
      <Box position="fixed" top={0} left={0} right={0} zIndex={9999}>
        {status === 'offline' && (
          <Alert status="warning" variant="solid">
            <AlertIcon as={MdWifiOff} />
            <AlertTitle mr={2}>You're offline</AlertTitle>
            <AlertDescription fontSize="sm">
              Changes will sync when you're back online
            </AlertDescription>
          </Alert>
        )}
        {status === 'online' && (
          <Alert status="success" variant="solid">
            <AlertIcon as={MdCheckCircle} />
            <AlertTitle mr={2}>Back online</AlertTitle>
            <AlertDescription fontSize="sm">
              Syncing your changes...
            </AlertDescription>
          </Alert>
        )}
      </Box>
    </ScaleFade>
  );
}

/**
 * Inline Connection Status Indicator - Small badge for toolbar
 */
export function ConnectionStatusBadge() {
  const [isConnected, setIsConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(isOnline());
    };

    checkConnection();
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);

    const interval = setInterval(checkConnection, 5000);

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
      clearInterval(interval);
    };
  }, []);

  if (isConnected && !isSyncing) {
    return null; // Don't show when everything is fine
  }

  return (
    <Tooltip
      label={
        !isConnected
          ? 'Offline - Changes will sync when reconnected'
          : 'Syncing changes...'
      }
      placement="bottom"
    >
      <Badge
        colorScheme={!isConnected ? 'red' : 'blue'}
        display="flex"
        alignItems="center"
        gap={1}
        px={2}
        py={1}
        cursor="pointer"
      >
        <Icon as={!isConnected ? MdWifiOff : MdSync} />
        <Text fontSize="xs">
          {!isConnected ? 'Offline' : 'Syncing'}
        </Text>
      </Badge>
    </Tooltip>
  );
}

/**
 * Detailed Connection Status Panel - For settings or status pages
 */
export function ConnectionStatusPanel() {
  const [networkStatus, setNetworkStatus] = useState({
    online: true,
    websocket: 'connected' as 'connected' | 'disconnected' | 'connecting',
    lastSync: new Date(),
    pendingChanges: 0,
  });

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    const updateStatus = () => {
      setNetworkStatus((prev) => ({
        ...prev,
        online: isOnline(),
      }));
    };

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const interval = setInterval(updateStatus, 3000);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      clearInterval(interval);
    };
  }, []);

  return (
    <Box
      p={4}
      bg={bgColor}
      borderRadius="lg"
      border="1px"
      borderColor={borderColor}
      shadow="sm"
    >
      <Text fontWeight="bold" mb={4}>
        Connection Status
      </Text>

      <Box space={4}>
        {/* Network Status */}
        <HStack justify="space-between" mb={3}>
          <HStack spacing={2}>
            <Icon
              as={networkStatus.online ? MdWifi : MdWifiOff}
              color={networkStatus.online ? 'green.500' : 'red.500'}
              boxSize={5}
            />
            <Text fontSize="sm">Network</Text>
          </HStack>
          <Badge colorScheme={networkStatus.online ? 'green' : 'red'}>
            {networkStatus.online ? 'Online' : 'Offline'}
          </Badge>
        </HStack>

        {/* WebSocket Status */}
        <HStack justify="space-between" mb={3}>
          <HStack spacing={2}>
            <Icon
              as={
                networkStatus.websocket === 'connected'
                  ? MdCloudDone
                  : MdCloudOff
              }
              color={
                networkStatus.websocket === 'connected'
                  ? 'green.500'
                  : 'orange.500'
              }
              boxSize={5}
            />
            <Text fontSize="sm">Real-time Sync</Text>
          </HStack>
          <Badge
            colorScheme={
              networkStatus.websocket === 'connected'
                ? 'green'
                : networkStatus.websocket === 'connecting'
                ? 'yellow'
                : 'red'
            }
          >
            {networkStatus.websocket}
          </Badge>
        </HStack>

        {/* Last Sync */}
        <HStack justify="space-between" mb={3}>
          <HStack spacing={2}>
            <Icon as={MdSync} color="blue.500" boxSize={5} />
            <Text fontSize="sm">Last Synced</Text>
          </HStack>
          <Text fontSize="sm" color="gray.600">
            {networkStatus.lastSync.toLocaleTimeString()}
          </Text>
        </HStack>

        {/* Pending Changes */}
        {networkStatus.pendingChanges > 0 && (
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" color="orange.600">
                Pending Changes: {networkStatus.pendingChanges}
              </Text>
            </HStack>
            <Progress
              size="sm"
              colorScheme="orange"
              isIndeterminate={!networkStatus.online}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

/**
 * Sync Progress Indicator - Shows progress of sync operations
 */
export function SyncProgressIndicator({
  isVisible,
  progress = 0,
  total = 0,
}: {
  isVisible: boolean;
  progress?: number;
  total?: number;
}) {
  const bgColor = useColorModeValue('white', 'gray.800');

  return (
    <Collapse in={isVisible} animateOpacity>
      <Box
        position="fixed"
        bottom={4}
        right={4}
        p={4}
        bg={bgColor}
        borderRadius="lg"
        shadow="lg"
        border="1px"
        borderColor="blue.200"
        minW="250px"
        zIndex={9998}
      >
        <HStack spacing={3} mb={2}>
          <Icon as={MdSync} color="blue.500" boxSize={5} className="spin" />
          <Text fontWeight="semibold" fontSize="sm">
            Syncing changes...
          </Text>
        </HStack>

        {total > 0 && (
          <>
            <Progress
              value={(progress / total) * 100}
              size="sm"
              colorScheme="blue"
              borderRadius="full"
              mb={2}
            />
            <Text fontSize="xs" color="gray.600">
              {progress} of {total} items synced
            </Text>
          </>
        )}

        {total === 0 && (
          <Progress size="sm" colorScheme="blue" isIndeterminate />
        )}

        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .spin {
              animation: spin 2s linear infinite;
            }
          `}
        </style>
      </Box>
    </Collapse>
  );
}

/**
 * Custom hook for connection status
 */
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnline, setLastOnline] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnline(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    lastOnline,
  };
}
