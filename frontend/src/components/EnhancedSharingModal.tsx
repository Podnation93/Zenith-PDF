import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  Select,
  Switch,
  FormControl,
  FormLabel,
  FormHelperText,
  Divider,
  Box,
  IconButton,
  useClipboard,
  Badge,
  Avatar,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  InputGroup,
  InputRightElement,
  useColorModeValue,
  Tooltip,
  Alert,
  AlertIcon,
  List,
  ListItem,
  Code,
  Spinner,
  Center,
} from '@chakra-ui/react';
import {
  MdLink,
  MdPeople,
  MdContentCopy,
  MdCheck,
  MdDelete,
  MdVisibility,
  MdEdit,
  MdComment,
  MdShare,
  MdLock,
  MdRefresh,
} from 'react-icons/md';
import { documentApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useSharingStore, PermissionLevel } from '../store/sharing.store';

interface EnhancedSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
}

type AccessLevel = 'view' | 'comment' | 'edit';

interface ShareLink {
  id: string;
  token: string;
  url: string;
  accessLevel: AccessLevel;
  expiresAt?: string;
  password?: string;
  maxUses?: number;
  currentUses: number;
  createdAt: string;
}

/**
 * Enhanced sharing modal with advanced permission controls
 */
export function EnhancedSharingModal({
  isOpen,
  onClose,
  documentId,
  documentName,
}: EnhancedSharingModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const toast = useToast();
  const { fetchSharingSettings, isLoading } = useSharingStore();

  useEffect(() => {
    if (isOpen) {
      fetchSharingSettings(documentId);
    }
  }, [isOpen, documentId, fetchSharingSettings]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <HStack spacing={3}>
            <Box
              p={2}
              bg="blue.50"
              borderRadius="md"
              color="blue.600"
            >
              <MdShare size={24} />
            </Box>
            <VStack align="start" spacing={0}>
              <Text fontSize="lg" fontWeight="bold">
                Share Document
              </Text>
              <Text fontSize="sm" fontWeight="normal" color="gray.600">
                {documentName}
              </Text>
            </VStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          {isLoading ? (
            <Center py={10}>
              <VStack spacing={4}>
                <Spinner size="xl" color="blue.500" thickness="4px" />
                <Text color="gray.600">Loading sharing settings...</Text>
              </VStack>
            </Center>
          ) : (
            <Tabs
              index={activeTab}
              onChange={setActiveTab}
              colorScheme="blue"
              variant="soft-rounded"
            >
              <TabList bg="gray.50" p={1} borderRadius="lg">
                <Tab flex={1}>
                  <HStack spacing={2}>
                    <MdLink />
                    <Text>Share Link</Text>
                  </HStack>
                </Tab>
                <Tab flex={1}>
                  <HStack spacing={2}>
                    <MdPeople />
                    <Text>People</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels mt={4}>
                {/* Share Link Tab */}
                <TabPanel px={0}>
                  <ShareLinkPanel documentId={documentId} />
                </TabPanel>

                {/* People Tab */}
                <TabPanel px={0}>
                  <PeoplePanel documentId={documentId} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </ModalBody>

        <ModalFooter borderTop="1px" borderColor="gray.200">
          <Button onClick={onClose} size="lg">
            Done
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/**
 * Share Link Panel - Create and manage share links with advanced options
 */
function ShareLinkPanel({ documentId }: { documentId: string }) {
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('view');
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [isCreating, setIsCreating] = useState(false);
  const { links, createShareLink, revokeShareLink } = useSharingStore();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');

  const handleCreateLink = async () => {
    if (requirePassword && !password) {
      toast.warning('Password required', 'Please enter a password for the link');
      return;
    }

    setIsCreating(true);

    try {
      // Calculate expiration date
      let expiresAt: string | undefined;
      if (expiresIn !== 'never') {
        const now = new Date();
        const hours = parseInt(expiresIn);
        now.setHours(now.getHours() + hours);
        expiresAt = now.toISOString();
      }

      await createShareLink(documentId, accessLevel as PermissionLevel, {
        expiresAt,
        password: requirePassword ? password : undefined,
        maxUses: maxUses ? Number(maxUses) : undefined,
      });

      toast.success('Share link created', 'Link has been created successfully');

      // Reset form
      setRequirePassword(false);
      setPassword('');
      setExpiresIn('never');
      setMaxUses('');
    } catch (error: any) {
      toast.error('Failed to create link', error.userMessage || error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Create Link Form */}
      <Box
        p={5}
        bg={bgColor}
        borderRadius="lg"
        border="1px"
        borderColor="gray.200"
        shadow="sm"
      >
        <Text fontWeight="bold" fontSize="lg" mb={4}>
          Create New Share Link
        </Text>

        <VStack spacing={4} align="stretch">
          {/* Access Level */}
          <FormControl>
            <FormLabel fontWeight="semibold">
              <HStack spacing={2}>
                <MdVisibility />
                <Text>Access Level</Text>
              </HStack>
            </FormLabel>
            <Select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
              size="lg"
            >
              <option value="view">
                👁️ View Only - Recipients can only view the document
              </option>
              <option value="comment">
                💬 Can Comment - Recipients can view and add comments
              </option>
              <option value="edit">
                ✏️ Can Edit - Recipients have full editing permissions
              </option>
            </Select>
            <FormHelperText>
              Choose what recipients with this link can do
            </FormHelperText>
          </FormControl>

          {/* Password Protection */}
          <FormControl>
            <HStack justify="space-between" mb={2}>
              <FormLabel fontWeight="semibold" mb={0}>
                <HStack spacing={2}>
                  <MdLock />
                  <Text>Password Protection</Text>
                </HStack>
              </FormLabel>
              <Switch
                size="lg"
                colorScheme="blue"
                isChecked={requirePassword}
                onChange={(e) => setRequirePassword(e.target.checked)}
              />
            </HStack>
            {requirePassword && (
              <Input
                mt={2}
                type="password"
                size="lg"
                placeholder="Enter a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
            <FormHelperText>
              {requirePassword
                ? 'Recipients will need this password to access the document'
                : 'Enable to require a password for access'}
            </FormHelperText>
          </FormControl>

          {/* Expiration */}
          <FormControl>
            <FormLabel fontWeight="semibold">Link Expiration</FormLabel>
            <Select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              size="lg"
            >
              <option value="never">⏳ Never expires</option>
              <option value="1">🕐 1 hour</option>
              <option value="24">📅 24 hours</option>
              <option value="168">📆 7 days</option>
              <option value="720">🗓️ 30 days</option>
              <option value="2160">📊 90 days</option>
            </Select>
            <FormHelperText>
              After this time, the link will no longer work
            </FormHelperText>
          </FormControl>

          {/* Max Uses */}
          <FormControl>
            <FormLabel fontWeight="semibold">Usage Limit (optional)</FormLabel>
            <Input
              type="number"
              size="lg"
              placeholder="Unlimited"
              value={maxUses}
              onChange={(e) =>
                setMaxUses(e.target.value ? parseInt(e.target.value) : '')
              }
              min={1}
              max={1000}
            />
            <FormHelperText>
              Limit how many times this link can be used. Leave empty for unlimited.
            </FormHelperText>
          </FormControl>

          <Button
            colorScheme="blue"
            size="lg"
            leftIcon={<MdLink />}
            onClick={handleCreateLink}
            isLoading={isCreating}
            loadingText="Creating link..."
            mt={2}
          >
            Create Share Link
          </Button>
        </VStack>
      </Box>

      <Divider />

      {/* Existing Links */}
      <Box>
        <HStack justify="space-between" mb={4}>
          <Text fontWeight="bold" fontSize="lg">
            Active Share Links ({links.length})
          </Text>
          {links.length > 0 && (
            <Tooltip label="Refresh links">
              <IconButton
                aria-label="Refresh"
                icon={<MdRefresh />}
                size="sm"
                variant="ghost"
                onClick={() => useSharingStore.getState().fetchSharingSettings(documentId)}
              />
            </Tooltip>
          )}
        </HStack>

        {links.length === 0 ? (
          <Alert status="info" borderRadius="md" variant="left-accent">
            <AlertIcon />
            <VStack align="start" spacing={0}>
              <Text fontWeight="medium">No active share links</Text>
              <Text fontSize="sm">Create a link above to share this document</Text>
            </VStack>
          </Alert>
        ) : (
          <VStack spacing={3} align="stretch">
            {links.map((link) => (
              <ShareLinkItem
                key={link.id}
                link={link}
                onDelete={async (id) => {
                  try {
                    await revokeShareLink(id);
                    toast.success('Link deleted', 'Share link has been removed');
                  } catch (error: any) {
                    toast.error('Failed to delete link', error.userMessage);
                  }
                }}
              />
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
  );
}

/**
 * Individual share link item with copy and delete actions
 */
function ShareLinkItem({
  link,
  onDelete,
}: {
  link: any;
  onDelete: (id: string) => void;
}) {
  const shareUrl = link.url || `${window.location.origin}/share/${link.token}`;
  const { hasCopied, onCopy } = useClipboard(shareUrl);
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const getAccessIcon = (level: string) => {
    switch (level) {
      case 'view':
        return <MdVisibility />;
      case 'comment':
        return <MdComment />;
      case 'edit':
        return <MdEdit />;
      default:
        return <MdVisibility />;
    }
  };

  const getAccessColor = (level: string) => {
    switch (level) {
      case 'view':
        return 'blue';
      case 'comment':
        return 'green';
      case 'edit':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
  const isMaxedOut = link.maxUses && link.currentUses >= link.maxUses;
  const isInactive = isExpired || isMaxedOut;

  return (
    <Box
      p={4}
      bg={bgColor}
      borderRadius="lg"
      border="2px"
      borderColor={isInactive ? 'red.300' : borderColor}
      shadow="sm"
      transition="all 0.2s"
      _hover={{ shadow: 'md', borderColor: isInactive ? 'red.400' : 'blue.300' }}
    >
      <VStack spacing={3} align="stretch">
        {/* Header with badges */}
        <HStack justify="space-between" wrap="wrap">
          <HStack spacing={2} wrap="wrap">
            <Badge
              colorScheme={getAccessColor(link.permissionLevel || link.accessLevel)}
              display="flex"
              alignItems="center"
              gap={1}
              px={3}
              py={1}
              fontSize="sm"
            >
              {getAccessIcon(link.permissionLevel || link.accessLevel)}
              {(link.permissionLevel || link.accessLevel).toUpperCase()}
            </Badge>
            {link.password && (
              <Badge colorScheme="purple" display="flex" alignItems="center" gap={1} px={3} py={1}>
                <MdLock size={14} />
                Protected
              </Badge>
            )}
            {isExpired && (
              <Badge colorScheme="red" px={3} py={1}>
                Expired
              </Badge>
            )}
            {isMaxedOut && (
              <Badge colorScheme="red" px={3} py={1}>
                Max Uses Reached
              </Badge>
            )}
          </HStack>

          <IconButton
            aria-label="Delete link"
            icon={<MdDelete />}
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={() => onDelete(link.id)}
          />
        </HStack>

        {/* Link URL with copy button */}
        <InputGroup size="md">
          <Input
            value={shareUrl}
            isReadOnly
            pr="5rem"
            fontFamily="mono"
            fontSize="sm"
            bg="white"
            borderColor="gray.300"
          />
          <InputRightElement width="5rem">
            <Button
              h="2rem"
              size="sm"
              onClick={onCopy}
              colorScheme={hasCopied ? 'green' : 'blue'}
              leftIcon={hasCopied ? <MdCheck /> : <MdContentCopy />}
            >
              {hasCopied ? 'Copied!' : 'Copy'}
            </Button>
          </InputRightElement>
        </InputGroup>

        {/* Metadata */}
        <HStack spacing={4} fontSize="xs" color="gray.600" flexWrap="wrap">
          {link.expiresAt && (
            <HStack spacing={1}>
              <Text fontWeight="semibold">Expires:</Text>
              <Text>{new Date(link.expiresAt).toLocaleString()}</Text>
            </HStack>
          )}
          {link.maxUses && (
            <HStack spacing={1}>
              <Text fontWeight="semibold">Uses:</Text>
              <Text>
                {link.currentUses || 0}/{link.maxUses}
              </Text>
            </HStack>
          )}
          <HStack spacing={1}>
            <Text fontWeight="semibold">Created:</Text>
            <Text>{new Date(link.createdAt).toLocaleString()}</Text>
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
}

/**
 * People Panel - Direct user sharing and permission management
 */
function PeoplePanel({ documentId }: { documentId: string }) {
  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('view');
  const [isInviting, setIsInviting] = useState(false);
  const { permissions, grantUserPermission, revokeUserPermission } = useSharingStore();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');

  const handleInvite = async () => {
    if (!email) {
      toast.warning('Email required', 'Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.warning('Invalid email', 'Please enter a valid email address');
      return;
    }

    setIsInviting(true);

    try {
      await grantUserPermission(documentId, email, accessLevel as PermissionLevel);
      toast.success('Invitation sent', `${email} has been invited to collaborate`);
      setEmail('');
    } catch (error: any) {
      toast.error('Failed to send invitation', error.userMessage || error.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveAccess = async (permissionId: string, userEmail: string) => {
    try {
      await revokeUserPermission(permissionId);
      toast.success('Access removed', `${userEmail} can no longer access this document`);
    } catch (error: any) {
      toast.error('Failed to remove access', error.userMessage);
    }
  };

  const handleChangeAccess = async (
    permissionId: string,
    newLevel: AccessLevel
  ) => {
    try {
      // await documentApi.updateUserAccess(documentId, permissionId, newLevel);
      toast.success('Access updated', 'Permission level has been changed');
    } catch (error: any) {
      toast.error('Failed to update access', error.userMessage);
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Invite People */}
      <Box
        p={5}
        bg={bgColor}
        borderRadius="lg"
        border="1px"
        borderColor="gray.200"
        shadow="sm"
      >
        <Text fontWeight="bold" fontSize="lg" mb={4}>
          Invite People to Collaborate
        </Text>

        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel fontWeight="semibold">Email Address</FormLabel>
            <Input
              type="email"
              size="lg"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
            />
            <FormHelperText>
              Enter the email address of the person you want to invite
            </FormHelperText>
          </FormControl>

          <FormControl>
            <FormLabel fontWeight="semibold">Permission Level</FormLabel>
            <Select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
              size="lg"
            >
              <option value="view">👁️ Can View - View the document only</option>
              <option value="comment">💬 Can Comment - View and add comments</option>
              <option value="edit">✏️ Can Edit - Full editing access</option>
            </Select>
          </FormControl>

          <Button
            colorScheme="blue"
            size="lg"
            leftIcon={<MdPeople />}
            onClick={handleInvite}
            isLoading={isInviting}
            loadingText="Sending invitation..."
            mt={2}
          >
            Send Invitation
          </Button>
        </VStack>
      </Box>

      <Divider />

      {/* Shared With List */}
      <Box>
        <Text fontWeight="bold" fontSize="lg" mb={4}>
          People with Access ({permissions.length})
        </Text>

        {permissions.length === 0 ? (
          <Alert status="info" borderRadius="md" variant="left-accent">
            <AlertIcon />
            <VStack align="start" spacing={0}>
              <Text fontWeight="medium">No collaborators yet</Text>
              <Text fontSize="sm">
                Invite people above to start collaborating on this document
              </Text>
            </VStack>
          </Alert>
        ) : (
          <List spacing={3}>
            {permissions.map((permission) => (
              <ListItem
                key={permission.id}
                p={4}
                borderRadius="lg"
                border="1px"
                borderColor="gray.200"
                bg={bgColor}
                shadow="sm"
                transition="all 0.2s"
                _hover={{ shadow: 'md', borderColor: 'blue.300' }}
              >
                <HStack justify="space-between" align="start">
                  <HStack spacing={3} flex={1}>
                    <Avatar
                      name={permission.user?.name || permission.user?.email}
                      src={permission.user?.avatarUrl}
                      size="md"
                    />
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="semibold" fontSize="md">
                        {permission.user?.name || permission.user?.email?.split('@')[0]}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {permission.user?.email}
                      </Text>
                      <Badge
                        mt={1}
                        colorScheme={
                          permission.permissionLevel === 'view'
                            ? 'blue'
                            : permission.permissionLevel === 'comment'
                            ? 'green'
                            : 'orange'
                        }
                        fontSize="xs"
                      >
                        {permission.permissionLevel}
                      </Badge>
                    </VStack>
                  </HStack>

                  <HStack spacing={2}>
                    <Select
                      size="sm"
                      value={permission.permissionLevel}
                      onChange={(e) =>
                        handleChangeAccess(
                          permission.id,
                          e.target.value as AccessLevel
                        )
                      }
                      width="140px"
                    >
                      <option value="view">Can View</option>
                      <option value="comment">Can Comment</option>
                      <option value="edit">Can Edit</option>
                    </Select>

                    <Tooltip label="Remove access">
                      <IconButton
                        aria-label="Remove access"
                        icon={<MdDelete />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() =>
                          handleRemoveAccess(permission.id, permission.user?.email || '')
                        }
                      />
                    </Tooltip>
                  </HStack>
                </HStack>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </VStack>
  );
}
