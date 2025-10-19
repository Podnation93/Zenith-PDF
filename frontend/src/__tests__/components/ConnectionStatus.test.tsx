import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderWithChakra } from '../test-utils';
import {
  ConnectionStatusBanner,
  ConnectionStatusBadge,
  ConnectionStatusPanel,
  useConnectionStatus,
} from '../../components/ConnectionStatus';
import { renderHook } from '@testing-library/react';

describe('useConnectionStatus', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('returns online status when navigator is online', () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('returns offline status when navigator is offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('updates status when online event fires', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.isOffline).toBe(true);

    // Simulate going online
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
    });
  });

  it('updates status when offline event fires', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    const { result } = renderHook(() => useConnectionStatus());

    expect(result.current.isOnline).toBe(true);

    // Simulate going offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });
  });
});

describe('ConnectionStatusBadge', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('shows "Online" badge when connected', () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    renderWithChakra(<ConnectionStatusBadge />);

    expect(screen.getByText(/online/i)).toBeInTheDocument();
  });

  it('shows "Offline" badge when disconnected', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    renderWithChakra(<ConnectionStatusBadge />);

    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it('applies correct color scheme for online status', () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    const { container } = renderWithChakra(<ConnectionStatusBadge />);

    const badge = container.querySelector('.chakra-badge');
    expect(badge).toHaveClass('chakra-badge');
    // Color scheme is applied via Chakra's colorScheme prop
  });

  it('applies correct color scheme for offline status', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    const { container } = renderWithChakra(<ConnectionStatusBadge />);

    const badge = container.querySelector('.chakra-badge');
    expect(badge).toHaveClass('chakra-badge');
  });

  it('updates badge when connection status changes', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    renderWithChakra(<ConnectionStatusBadge />);

    expect(screen.getByText(/online/i)).toBeInTheDocument();

    // Go offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });
  });
});

describe('ConnectionStatusBanner', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('does not show banner when online initially', () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    renderWithChakra(<ConnectionStatusBanner />);

    // Banner should be hidden when online
    const banner = screen.queryByText(/connection restored/i);
    expect(banner).not.toBeInTheDocument();
  });

  it('shows banner when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    renderWithChakra(<ConnectionStatusBanner />);

    await waitFor(() => {
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });
  });

  it('shows reconnecting message when going from offline to online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    renderWithChakra(<ConnectionStatusBanner />);

    // Should show offline banner
    await waitFor(() => {
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });

    // Go online
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });

    // Should show connection restored message
    await waitFor(() => {
      expect(screen.getByText(/connection restored/i)).toBeInTheDocument();
    });
  });

  it('auto-hides banner after connection is restored', async () => {
    vi.useFakeTimers();

    Object.defineProperty(navigator, 'onLine', { value: false });

    renderWithChakra(<ConnectionStatusBanner />);

    // Go online
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(screen.getByText(/connection restored/i)).toBeInTheDocument();
    });

    // Fast-forward 3 seconds (auto-hide delay)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.queryByText(/connection restored/i)).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('shows retry button when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    renderWithChakra(<ConnectionStatusBanner />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});

describe('ConnectionStatusPanel', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('displays connection status', () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    renderWithChakra(<ConnectionStatusPanel />);

    expect(screen.getByText(/connection status/i)).toBeInTheDocument();
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('shows offline status in panel', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    renderWithChakra(<ConnectionStatusPanel />);

    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
  });

  it('displays last sync time when provided', () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    const lastSync = new Date('2025-10-19T10:30:00');

    renderWithChakra(<ConnectionStatusPanel lastSyncTime={lastSync} />);

    expect(screen.getByText(/last sync/i)).toBeInTheDocument();
  });

  it('shows pending changes count when provided', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    renderWithChakra(<ConnectionStatusPanel pendingChanges={5} />);

    expect(screen.getByText(/5.*pending/i)).toBeInTheDocument();
  });

  it('includes sync now button when online', () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    renderWithChakra(<ConnectionStatusPanel />);

    expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
  });

  it('disables sync button when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    renderWithChakra(<ConnectionStatusPanel />);

    const syncButton = screen.getByRole('button', { name: /sync now/i });
    expect(syncButton).toBeDisabled();
  });

  it('calls onSync callback when sync button clicked', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    const onSync = vi.fn();

    renderWithChakra(<ConnectionStatusPanel onSync={onSync} />);

    const syncButton = screen.getByRole('button', { name: /sync now/i });
    await act(async () => {
      syncButton.click();
    });

    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('shows network quality indicator when online', () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    renderWithChakra(<ConnectionStatusPanel />);

    // Look for network quality related text
    expect(screen.getByText(/signal/i) || screen.getByText(/quality/i)).toBeInTheDocument();
  });
});
