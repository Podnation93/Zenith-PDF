import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import type { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let shortcuts: KeyboardShortcut[];

  beforeEach(() => {
    shortcuts = [
      {
        key: 's',
        ctrlKey: true,
        description: 'Save document',
        action: vi.fn(),
      },
      {
        key: 'p',
        ctrlKey: true,
        description: 'Print',
        action: vi.fn(),
        preventDefault: true,
      },
      {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
        description: 'Redo',
        action: vi.fn(),
      },
      {
        key: 'ArrowRight',
        description: 'Next page',
        action: vi.fn(),
      },
    ];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls action when matching shortcut is pressed', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const saveShortcut = shortcuts[0];
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });

    window.dispatchEvent(event);

    expect(saveShortcut.action).toHaveBeenCalledTimes(1);
  });

  it('does not call action when non-matching key is pressed', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', {
      key: 'x',
      ctrlKey: true,
    });

    window.dispatchEvent(event);

    shortcuts.forEach((shortcut) => {
      expect(shortcut.action).not.toHaveBeenCalled();
    });
  });

  it('matches shortcuts with modifier keys correctly', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const redoShortcut = shortcuts[2];
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
    });

    window.dispatchEvent(event);

    expect(redoShortcut.action).toHaveBeenCalledTimes(1);
  });

  it('does not match when modifier keys are missing', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const saveShortcut = shortcuts[0];
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: false, // Missing Ctrl
    });

    window.dispatchEvent(event);

    expect(saveShortcut.action).not.toHaveBeenCalled();
  });

  it('prevents default when preventDefault is true', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', {
      key: 'p',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('prevents default by default (preventDefault not specified)', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('does not prevent default when preventDefault is false', () => {
    const noPreventShortcuts: KeyboardShortcut[] = [
      {
        key: 'a',
        description: 'Action A',
        action: vi.fn(),
        preventDefault: false,
      },
    ];

    renderHook(() => useKeyboardShortcuts(noPreventShortcuts));

    const event = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      cancelable: true,
    });

    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when typing in input fields', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    });

    Object.defineProperty(event, 'target', { value: input, enumerable: true });

    window.dispatchEvent(event);

    shortcuts.forEach((shortcut) => {
      expect(shortcut.action).not.toHaveBeenCalled();
    });

    document.body.removeChild(input);
  });

  it('ignores shortcuts when typing in textarea', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    });

    Object.defineProperty(event, 'target', { value: textarea, enumerable: true });

    window.dispatchEvent(event);

    shortcuts.forEach((shortcut) => {
      expect(shortcut.action).not.toHaveBeenCalled();
    });

    document.body.removeChild(textarea);
  });

  it('ignores shortcuts when typing in contentEditable', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    });

    Object.defineProperty(event, 'target', { value: div, enumerable: true });

    window.dispatchEvent(event);

    shortcuts.forEach((shortcut) => {
      expect(shortcut.action).not.toHaveBeenCalled();
    });

    document.body.removeChild(div);
  });

  it('can be disabled via enabled parameter', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useKeyboardShortcuts(shortcuts, enabled),
      { initialProps: { enabled: false } }
    );

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });

    window.dispatchEvent(event);

    expect(shortcuts[0].action).not.toHaveBeenCalled();

    // Enable shortcuts
    rerender({ enabled: true });

    window.dispatchEvent(event);

    expect(shortcuts[0].action).toHaveBeenCalledTimes(1);
  });

  it('is case-insensitive for key matching', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const saveShortcut = shortcuts[0];

    // Press uppercase S
    const event1 = new KeyboardEvent('keydown', {
      key: 'S',
      ctrlKey: true,
    });

    window.dispatchEvent(event1);

    expect(saveShortcut.action).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();

    // Press lowercase s
    const event2 = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });

    window.dispatchEvent(event2);

    expect(saveShortcut.action).toHaveBeenCalledTimes(1);
  });

  it('handles arrow key shortcuts', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const nextPageShortcut = shortcuts[3];
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
    });

    window.dispatchEvent(event);

    expect(nextPageShortcut.action).toHaveBeenCalledTimes(1);
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it('handles multiple shortcuts in sequence', () => {
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const saveShortcut = shortcuts[0];
    const printShortcut = shortcuts[1];

    // Press Ctrl+S
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true })
    );

    expect(saveShortcut.action).toHaveBeenCalledTimes(1);
    expect(printShortcut.action).not.toHaveBeenCalled();

    // Press Ctrl+P
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'p', ctrlKey: true })
    );

    expect(saveShortcut.action).toHaveBeenCalledTimes(1);
    expect(printShortcut.action).toHaveBeenCalledTimes(1);
  });

  it('handles empty shortcuts array gracefully', () => {
    renderHook(() => useKeyboardShortcuts([]));

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
    });

    // Should not throw
    expect(() => window.dispatchEvent(event)).not.toThrow();
  });

  it('updates when shortcuts change', () => {
    const { rerender } = renderHook(
      ({ shortcuts }) => useKeyboardShortcuts(shortcuts),
      { initialProps: { shortcuts } }
    );

    const newShortcuts: KeyboardShortcut[] = [
      {
        key: 'n',
        ctrlKey: true,
        description: 'New',
        action: vi.fn(),
      },
    ];

    rerender({ shortcuts: newShortcuts });

    // Old shortcut should not work
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true })
    );

    expect(shortcuts[0].action).not.toHaveBeenCalled();

    // New shortcut should work
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'n', ctrlKey: true })
    );

    expect(newShortcuts[0].action).toHaveBeenCalledTimes(1);
  });
});
