import { Avatar, AvatarGroup as ChakraAvatarGroup, Tooltip } from '@chakra-ui/react';
import { usePresenceStore } from '../store/presence.store';

export function PresenceAvatarGroup() {
  const presentUsers = usePresenceStore((state) => state.presentUsers);
  const users = Object.values(presentUsers);

  if (users.length === 0) {
    return null; // Don't render anything if no other users are present
  }

  return (
    <ChakraAvatarGroup size="sm" max={3} spacing={-2}>
      {users.map((user) => (
        <Tooltip key={user.id} label={user.name} placement="bottom">
          <Avatar name={user.name} src={user.avatarUrl} />
        </Tooltip>
      ))}
    </ChakraAvatarGroup>
  );
}
