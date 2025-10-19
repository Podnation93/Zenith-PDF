import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
}

/**
 * Hook for registering keyboard shortcuts
 * @param shortcuts - Array of keyboard shortcut configurations
 * @param enabled - Whether shortcuts are enabled
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const matchedShortcut = shortcutsRef.current.find((shortcut) => {
        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
        const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
        const altMatches = !!shortcut.altKey === event.altKey;
        const metaMatches = !!shortcut.metaKey === event.metaKey;

        return (
          keyMatches &&
          ctrlMatches &&
          shiftMatches &&
          altMatches &&
          metaMatches
        );
      });

      if (matchedShortcut) {
        if (matchedShortcut.preventDefault !== false) {
          event.preventDefault();
        }
        matchedShortcut.action();
      }
    },
    [enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Format keyboard shortcut for display
 * @param shortcut - Keyboard shortcut configuration
 * @returns Formatted shortcut string (e.g., "Ctrl+S")
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey || shortcut.metaKey) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (shortcut.altKey) {
    parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
  }
  if (shortcut.shiftKey) {
    parts.push(navigator.platform.includes('Mac') ? '⇧' : 'Shift');
  }

  parts.push(shortcut.key.toUpperCase());

  return parts.join('+');
}

/**
 * Default keyboard shortcuts for PDF viewer
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  {
    key: 'ArrowLeft',
    description: 'Previous page',
    action: () => {}, // Will be overridden
  },
  {
    key: 'ArrowRight',
    description: 'Next page',
    action: () => {},
  },
  {
    key: 'Home',
    description: 'First page',
    action: () => {},
  },
  {
    key: 'End',
    description: 'Last page',
    action: () => {},
  },

  // Zoom
  {
    key: '=',
    ctrlKey: true,
    description: 'Zoom in',
    action: () => {},
  },
  {
    key: '-',
    ctrlKey: true,
    description: 'Zoom out',
    action: () => {},
  },
  {
    key: '0',
    ctrlKey: true,
    description: 'Reset zoom',
    action: () => {},
  },

  // Annotation tools
  {
    key: 'h',
    description: 'Highlight tool',
    action: () => {},
  },
  {
    key: 'c',
    description: 'Comment tool',
    action: () => {},
  },
  {
    key: 's',
    description: 'Sticky note tool',
    action: () => {},
  },
  {
    key: 'u',
    description: 'Underline tool',
    action: () => {},
  },
  {
    key: 't',
    description: 'Strikethrough tool',
    action: () => {},
  },
  {
    key: 'Escape',
    description: 'Deselect tool',
    action: () => {},
  },

  // Document actions
  {
    key: 's',
    ctrlKey: true,
    description: 'Save/Export',
    action: () => {},
  },
  {
    key: 'p',
    ctrlKey: true,
    description: 'Print',
    action: () => {},
  },
  {
    key: 'f',
    ctrlKey: true,
    description: 'Search',
    action: () => {},
  },

  // UI toggles
  {
    key: 'b',
    ctrlKey: true,
    description: 'Toggle sidebar',
    action: () => {},
  },
  {
    key: '/',
    description: 'Show keyboard shortcuts',
    action: () => {},
  },
];

/**
 * Hook for PDF viewer shortcuts
 */
export function usePDFViewerShortcuts(handlers: {
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onFirstPage?: () => void;
  onLastPage?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onHighlight?: () => void;
  onComment?: () => void;
  onStickyNote?: () => void;
  onUnderline?: () => void;
  onStrikethrough?: () => void;
  onDeselectTool?: () => void;
  onSave?: () => void;
  onPrint?: () => void;
  onSearch?: () => void;
  onToggleSidebar?: () => void;
  onShowShortcuts?: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [
    // Navigation
    {
      key: 'ArrowLeft',
      description: 'Previous page',
      action: handlers.onPrevPage || (() => {}),
    },
    {
      key: 'ArrowRight',
      description: 'Next page',
      action: handlers.onNextPage || (() => {}),
    },
    {
      key: 'Home',
      description: 'First page',
      action: handlers.onFirstPage || (() => {}),
    },
    {
      key: 'End',
      description: 'Last page',
      action: handlers.onLastPage || (() => {}),
    },

    // Zoom
    {
      key: '=',
      ctrlKey: true,
      description: 'Zoom in',
      action: handlers.onZoomIn || (() => {}),
    },
    {
      key: '-',
      ctrlKey: true,
      description: 'Zoom out',
      action: handlers.onZoomOut || (() => {}),
    },
    {
      key: '0',
      ctrlKey: true,
      description: 'Reset zoom',
      action: handlers.onResetZoom || (() => {}),
    },

    // Annotation tools
    {
      key: 'h',
      description: 'Highlight tool',
      action: handlers.onHighlight || (() => {}),
    },
    {
      key: 'c',
      description: 'Comment tool',
      action: handlers.onComment || (() => {}),
    },
    {
      key: 's',
      description: 'Sticky note tool',
      action: handlers.onStickyNote || (() => {}),
    },
    {
      key: 'u',
      description: 'Underline tool',
      action: handlers.onUnderline || (() => {}),
    },
    {
      key: 't',
      description: 'Strikethrough tool',
      action: handlers.onStrikethrough || (() => {}),
    },
    {
      key: 'Escape',
      description: 'Deselect tool',
      action: handlers.onDeselectTool || (() => {}),
      preventDefault: false,
    },

    // Document actions
    {
      key: 's',
      ctrlKey: true,
      description: 'Save/Export',
      action: handlers.onSave || (() => {}),
    },
    {
      key: 'p',
      ctrlKey: true,
      description: 'Print',
      action: handlers.onPrint || (() => {}),
    },
    {
      key: 'f',
      ctrlKey: true,
      description: 'Search',
      action: handlers.onSearch || (() => {}),
    },

    // UI toggles
    {
      key: 'b',
      ctrlKey: true,
      description: 'Toggle sidebar',
      action: handlers.onToggleSidebar || (() => {}),
    },
    {
      key: '/',
      description: 'Show keyboard shortcuts',
      action: handlers.onShowShortcuts || (() => {}),
      preventDefault: false,
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
