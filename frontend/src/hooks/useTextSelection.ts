import { useState, useCallback, useEffect } from 'react';

export interface TextSelection {
  text: string;
  boundingRect: DOMRect;
  pageNumber: number;
  range: Range;
}

export function useTextSelection(containerRef: React.RefObject<HTMLElement>) {
  const [selection, setSelection] = useState<TextSelection | null>(null);

  const handleSelectionChange = useCallback(() => {
    const windowSelection = window.getSelection();

    if (!windowSelection || windowSelection.rangeCount === 0) {
      setSelection(null);
      return;
    }

    const range = windowSelection.getRangeAt(0);
    const selectedText = range.toString().trim();

    // Only process if there's actual selected text
    if (!selectedText || selectedText.length === 0) {
      setSelection(null);
      return;
    }

    // Check if selection is within our container
    if (containerRef.current && !containerRef.current.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    const boundingRect = range.getBoundingClientRect();

    // Try to determine page number from the selection
    // This is a simplified version - you might need to enhance based on your PDF structure
    let pageNumber = 1;
    const element = range.startContainer.parentElement;
    if (element) {
      const pageElement = element.closest('[data-page-number]');
      if (pageElement) {
        pageNumber = parseInt(pageElement.getAttribute('data-page-number') || '1', 10);
      }
    }

    setSelection({
      text: selectedText,
      boundingRect,
      pageNumber,
      range,
    });
  }, [containerRef]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return {
    selection,
    clearSelection,
  };
}
