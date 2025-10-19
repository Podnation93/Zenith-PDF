import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { PresenceIndicator, PresenceCount, ActiveUserList } from '../../components/PresenceIndicator';
import { usePresenceStore } from '../../store/presence.store';
import { useAuthStore } from '../../store/auth.store';

// Mock stores
vi.mock('../../store/presence.store');
vi.mock('../../store/auth.store');

const mockPresenceStore = usePresenceStore as any;
const mockAuthStore = useAuthStore as any;

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('PresenceIndicator', () => {
  beforeEach(() => {
    // Reset mocks
    mockPresenceStore.mockReturnValue({
      presentUsers: {},
    });

    mockAuthStore.mockReturnValue({
      user: { id: 'current-user', name: 'Current User', email: 'current@example.com' },
    });
  });

  it('renders nothing when no other users are present', () => {
    const { container } = renderWithChakra(<PresenceIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('displays correct count of viewers', () => {
    mockPresenceStore.mockReturnValue({
      presentUsers: {
        'user-1': { id: 'user-1', name: 'User One', avatarUrl: '' },
        'user-2': { id: 'user-2', name: 'User Two', avatarUrl: '' },
      },
    });

    renderWithChakra(<PresenceIndicator showNames />);

    expect(screen.getByText('2 viewers')).toBeInTheDocument();
  });

  it('displays singular "viewer" for one user', () => {
    mockPresenceStore.mockReturnValue({
      presentUsers: {
        'user-1': { id: 'user-1', name: 'User One', avatarUrl: '' },
      },
    });

    renderWithChakra(<PresenceIndicator showNames />);

    expect(screen.getByText('1 viewer')).toBeInTheDocument();
  });

  it('filters out current user from display', () => {
    mockPresenceStore.mockReturnValue({
      presentUsers: {
        'current-user': { id: 'current-user', name: 'Current User', avatarUrl: '' },
        'user-1': { id: 'user-1', name: 'User One', avatarUrl: '' },
      },
    });

    renderWithChakra(<PresenceIndicator showNames />);

    // Should only show 1 viewer (user-1), not current user
    expect(screen.getByText('1 viewer')).toBeInTheDocument();
  });

  it('respects maxAvatars prop', () => {
    const users: any = {};
    for (let i = 1; i <= 10; i++) {
      users[`user-${i}`] = { id: `user-${i}`, name: `User ${i}`, avatarUrl: '' };
    }

    mockPresenceStore.mockReturnValue({
      presentUsers: users,
    });

    renderWithChakra(<PresenceIndicator maxAvatars={5} />);

    // Should show +5 badge for overflow
    expect(screen.getByText('+5')).toBeInTheDocument();
  });
});

describe('PresenceCount', () => {
  it('renders nothing when no users are online', () => {
    mockPresenceStore.mockReturnValue({
      presentUsers: {},
    });

    const { container } = renderWithChakra(<PresenceCount />);
    expect(container.firstChild).toBeNull();
  });

  it('displays correct online count', () => {
    mockPresenceStore.mockReturnValue({
      presentUsers: {
        'user-1': { id: 'user-1', name: 'User One' },
        'user-2': { id: 'user-2', name: 'User Two' },
      },
    });

    renderWithChakra(<PresenceCount />);

    expect(screen.getByText('2 online')).toBeInTheDocument();
  });
});

describe('ActiveUserList', () => {
  it('shows empty state when no users', () => {
    mockPresenceStore.mockReturnValue({
      presentUsers: {},
    });

    renderWithChakra(<ActiveUserList />);

    expect(screen.getByText('No other users viewing')).toBeInTheDocument();
  });

  it('displays list of active users', () => {
    mockPresenceStore.mockReturnValue({
      presentUsers: {
        'user-1': { id: 'user-1', name: 'Alice', avatarUrl: '' },
        'user-2': { id: 'user-2', name: 'Bob', avatarUrl: '' },
      },
    });

    renderWithChakra(<ActiveUserList />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Active Users (2)')).toBeInTheDocument();
  });

  it('shows online indicators for each user', () => {
    mockPresenceStore.mockReturnValue({
      presentUsers: {
        'user-1': { id: 'user-1', name: 'Alice', avatarUrl: '' },
      },
    });

    renderWithChakra(<ActiveUserList />);

    expect(screen.getByText('Viewing document')).toBeInTheDocument();
  });
});
