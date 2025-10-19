import { useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, useDisclosure, VStack, Heading, Input, HStack, IconButton, useClipboard, useToast,
  Select, Text, Spinner, Box, Tag, Flex
} from '@chakra-ui/react';
import { FiCopy, FiTrash2, FiShare2 } from 'react-icons/fi';
import { useSharingStore, PermissionLevel } from '../store/sharing.store';

interface SharingModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SharingModal({ documentId, isOpen, onClose }: SharingModalProps) {
  const {
    links, permissions, isLoading, error,
    fetchSharingSettings, createShareLink, revokeShareLink,
    grantUserPermission, revokeUserPermission
  } = useSharingStore();

  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<PermissionLevel>('comment');
  const { onCopy, setValue } = useClipboard('');
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchSharingSettings(documentId);
    }
  }, [isOpen, documentId, fetchSharingSettings]);

  const handleCreateLink = async (permissionLevel: PermissionLevel) => {
    try {
      await createShareLink(documentId, permissionLevel);
      toast({ title: 'Share link created', status: 'success' });
    } catch { toast({ title: 'Failed to create link', status: 'error' }); }
  };

  const handleCopyLink = (url: string) => {
    setValue(url);
    onCopy();
    toast({ title: 'Link copied to clipboard', status: 'info' });
  };

  const handleGrantPermission = async () => {
    if (!inviteEmail) return;
    try {
      await grantUserPermission(documentId, inviteEmail, invitePermission);
      setInviteEmail('');
      toast({ title: 'Permission granted', status: 'success' });
    } catch { toast({ title: 'Failed to grant permission', status: 'error' }); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Share Document</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Center h="200px"><Spinner /></Center>
          ) : error ? (
            <Text color="red.500">{error}</Text>
          ) : (
            <VStack spacing={6} align="stretch">
              {/* Invite Users */}
              <Box>
                <Heading size="sm" mb={2}>Invite people</Heading>
                <HStack>
                  <Input
                    placeholder="Enter email address..."
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Select 
                    w="150px" 
                    value={invitePermission} 
                    onChange={(e) => setInvitePermission(e.target.value as PermissionLevel)}
                  >
                    <option value="view">Can view</option>
                    <option value="comment">Can comment</option>
                    <option value="edit">Can edit</option>
                  </Select>
                  <Button onClick={handleGrantPermission} colorScheme="blue">Invite</Button>
                </HStack>
              </Box>

              {/* Manage Permissions */}
              <Box>
                <Heading size="sm" mb={2}>People with access</Heading>
                <VStack align="stretch">
                  {permissions.map(p => (
                    <Flex key={p.id} justify="space-between" align="center">
                      <Text>{p.user.email}</Text>
                      <HStack>
                        <Tag>{p.permissionLevel}</Tag>
                        <IconButton 
                          icon={<FiTrash2 />} 
                          aria-label="Revoke permission" 
                          size="sm" 
                          onClick={() => revokeUserPermission(p.id)}
                        />
                      </HStack>
                    </Flex>
                  ))}
                </VStack>
              </Box>

              {/* Shareable Links */}
              <Box>
                <Heading size="sm" mb={2}>Shareable Links</Heading>
                {links.length === 0 ? (
                  <Button leftIcon={<FiShare2 />} onClick={() => handleCreateLink('comment')}>
                    Create a link with comment access
                  </Button>
                ) : (
                  links.map(link => (
                    <HStack key={link.id} w="full">
                      <Input value={link.url} isReadOnly />
                      <Tag>{link.permissionLevel}</Tag>
                      <IconButton icon={<FiCopy />} aria-label="Copy link" onClick={() => handleCopyLink(link.url)} />
                      <IconButton icon={<FiTrash2 />} aria-label="Delete link" onClick={() => revokeShareLink(link.id)} />
                    </HStack>
                  ))
                )}
              </Box>
            </VStack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Done</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
