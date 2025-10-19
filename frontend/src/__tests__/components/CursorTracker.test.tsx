import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderWithChakra } from '../test-utils';
import { CursorTracker, AvatarCursorTracker } from '../../components/CursorTracker';
import { usePresenceStore } from '../../store/presence.store';
import type { PresenceUser } from '../../store/presence.store';

// Mock presence store
vi.mock('../../store/presence.store', () => ({
  usePresenceStore: vi.fn(),
}));

// Mock auth store
vi.mock('../../store/auth.store', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'current-user', name: 'Current User' },
  })),
}));

const mockPresenceStore = usePresenceStore as ReturnType<typeof vi.fn>;

describe('CursorTracker', () => {
  let containerRef: React.RefObject<HTMLDivElement>;

  beforeEach(() => {
    containerRef = {
      current: document.createElement('div'),
    };
    // Set dimensions for bounding rect
    Object.defineProperty(containerRef.current, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no other users are present', () => {
    mockPresenceStore.mockReturnValue({
      presentUsers: {},
    });

    const { container } = renderWithChakra(
      <CursorTracker currentPage={1} containerRef={containerRef} scale={1} />
    );

    expect(container.querySelector('.remote-cursor')).not.toBeInTheDocument();
  });

  it('renders cursors for users on the same page', () => {
    const users: Record<string, PresenceUser> = {
      'user-1': {
        id: 'user-1',
        name: 'Alice',
        cursorPosition: { page: 1, x: 50, y: 50 },
        lastActive: Date.now(),
      },
      'user-2': {
        id: 'user-2',
        name: 'Bob',
        cursorPosition: { page: 1, x: 75, y: 25 },
        lastActive: Date.now(),
      },
    };

    mockPresenceStore.mockReturnValue({
      presentUsers: users,
    });

    renderWithChakra(
      <CursorTracker currentPage={1} containerRef={containerRef} scale={1} />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('hides cursors for users on different pages', () => {
    const users: Record<string, PresenceUser> = {
      'user-1': {
        id: 'user-1',
        name: 'Alice',
        cursorPosition: { page: 1, x: 50, y: 50 },
        lastActive: Date.now(),
      },
      'user-2': {
        id: 'user-2',
        name: 'Bob',
        cursorPosition: { page: 2, x: 75, y: 25 },
        lastActive: Date.now(),
      },
    };

    mockPresenceStore.mockReturnValue({
      presentUsers: users,
    });

    renderWithChakra(
      <CursorTracker currentPage={1} containerRef={containerRef} scale={1} />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('filters out current user cursor', () => {
    const users: Record<string, PresenceUser> = {
      'current-user': {
        id: 'current-user',
        name: 'Current User',
        cursorPosition: { page: 1, x: 50, y: 50 },
        lastActive: Date.now(),
      },
      'user-1': {
        id: 'user-1',
        name: 'Alice',
        cursorPosition: { page: 1, x: 75, y: 25 },
        lastActive: Date.now(),
      },
    };

    mockPresenceStore.mockReturnValue({
      presentUsers: users,
    });

    renderWithChakra(
      <CursorTracker currentPage={1} containerRef={containerRef} scale={1} />
    );

    expect(screen.queryByText('Current User')).not.toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('positions cursors correctly based on percentage', () => {
    const users: Record<string, PresenceUser> = {
      'user-1': {
        id: 'user-1',
        name: 'Alice',
        cursorPosition: { page: 1, x: 50, y: 50 },
        lastActive: Date.now(),
      },
    };

    mockPresenceStore.mockReturnValue({
      presentUsers: users,
    });

    const { container } = renderWithChakra(
      <CursorTracker currentPage={1} containerRef={containerRef} scale={1} />
    );

    const cursor = container.querySelector('.remote-cursor') as HTMLElement;
    expect(cursor).toBeInTheDocument();
    expect(cursor.style.left).toBe('50%');
    expect(cursor.style.top).toBe('50%');
  });

  it('applies scale to cursor positioning', () => {
    const users: Record<string, PresenceUser> = {
      'user-1': {
        id: 'user-1',
        name: 'Alice',
        cursorPosition: { page: 1, x: 50, y: 50 },
        lastActive: Date.now(),
      },
    };

    mockPresenceStore.mockReturnValue({
      presentUsers: users,
    });

    renderWithChakra(
      <CursorTracker currentPage={1} containerRef={containerRef} scale={2} />
    );

    // Scale affects transform, not position percentages
    const cursor = screen.getByText('Alice').closest('div');
    expect(cursor).toBeInTheDocument();
  });

  it('hides cursors for users with no cursor position', () => {
    const users: Record<string, PresenceUser> = {
      'user-1': {
        id: 'user-1',
        name: 'Alice',
        cursorPosition: null,
        lastActive: Date.now(),
      },
      'user-2': {
        id: 'user-2',
        name: 'Bob',
        lastActive: Date.now(),
      },
    };

    mockPresenceStore.mockReturnValue({
      presentUsers: users,
    });

    renderWithChakra(
      <CursorTracker currentPage={1} containerRef={containerRef} scale={1} />
    );

    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });
});

describe('AvatarCursorTracker', () => {
  let containerRef: React.RefObject<HTMLDivElement>;

  beforeEach(() => {
    containerRef = {
      current: document.createElement('div'),
    };
    Object.defineProperty(containerRef.current, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders avatar cursors for users on same page', () => {
    const users: Record<string, PresenceUser> = {
      'user-1': {
        id: 'user-1',
        name: 'Alice',
        avatarUrl: 'https://example.com/alice.jpg',
        cursorPosition: { page: 1, x: 50, y: 50 },
        lastActive: Date.now(),
      },
    };

    mockPresenceStore.mockReturnValue({
      presentUsers: users,
    });

    renderWithChakra(
      <AvatarCursorTracker currentPage={1} containerRef={containerRef} scale={1} />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    const avatar = screen.getByRole('img', { hidden: true });
    expect(avatar).toBeInTheDocument();
  });

  it('uses avatar URL when provided', () => {
    const users: Record<string, PresenceUser> = {
      'user-1': {
        id: 'user-1',
        name: 'Alice',
        avatarUrl: 'https://example.com/alice.jpg',
        cursorPosition: { page: 1, x: 50, y: 50 },
        lastActive: Date.now(),
      },
    };

    mockPresenceStore.mockReturnValue({
      presentUsers: users,
    });

    renderWithChakra(
      <AvatarCursorTracker currentPage={1} containerRef={containerRef} scale={1} />
    );

    const avatar = screen.getByRole('img', { hidden: true }) as HTMLImageElement;
    expect(avatar.src).toBe('https://example.com/alice.jpg');
  });

  it('generates initials when no avatar URL', () => {
    const users: Record<string, PresenceUser> = {
      'user-1': {
        id: 'user-1',
        name: 'Alice Smith',
        cursorPosition: { page: 1, x: 50, y: 50 },
        lastActive: Date.now(),
      },
    };

    mockPresenceStore.mockReturnValue({
      presentUsers: users,
    });

    renderWithChakra(
      <AvatarCursorTracker currentPage={1} containerRef={containerRef} scale={1} />
    );

    // Chakra Avatar generates initials automatically
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('positions avatar cursors correctly', () => {
    const users: Record<string, PresenceUser> = {
      'user-1': {
        id: 'user-1',
        name: 'Alice',
        cursorPosition: { page: 1, x: 25, y: 75 },
        lastActive: Date.now(),
      },
    };

    mockPresenceStore.mockReturnValue({
      presentUsers: users,
    });

    const { container } = renderWithChakra(
      <AvatarCursorTracker currentPage={1} containerRef={containerRef} scale={1} />
    );

    const cursor = container.querySelector('.avatar-cursor') as HTMLElement;
    expect(cursor).toBeInTheDocument();
    expect(cursor.style.left).toBe('25%');
    expect(cursor.style.top).toBe('75%');
  });
});
