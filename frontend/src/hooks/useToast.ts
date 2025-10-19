import { useToast as useChakraToast, UseToastOptions } from '@chakra-ui/react';
import { useCallback } from 'react';

/**
 * Enhanced toast hook with predefined configurations
 */
export function useToast() {
  const chakraToast = useChakraToast();

  const toast = useCallback(
    (options: UseToastOptions) => {
      return chakraToast({
        position: 'bottom-right',
        duration: 5000,
        isClosable: true,
        ...options,
      });
    },
    [chakraToast]
  );

  const success = useCallback(
    (title: string, description?: string) => {
      return toast({
        title,
        description,
        status: 'success',
      });
    },
    [toast]
  );

  const error = useCallback(
    (title: string, description?: string) => {
      return toast({
        title,
        description,
        status: 'error',
        duration: 7000, // Longer duration for errors
      });
    },
    [toast]
  );

  const warning = useCallback(
    (title: string, description?: string) => {
      return toast({
        title,
        description,
        status: 'warning',
      });
    },
    [toast]
  );

  const info = useCallback(
    (title: string, description?: string) => {
      return toast({
        title,
        description,
        status: 'info',
      });
    },
    [toast]
  );

  const loading = useCallback(
    (title: string, description?: string) => {
      return toast({
        title,
        description,
        status: 'loading',
        duration: null, // Don't auto-dismiss loading toasts
      });
    },
    [toast]
  );

  return {
    toast,
    success,
    error,
    warning,
    info,
    loading,
    close: chakraToast.close,
    closeAll: chakraToast.closeAll,
    isActive: chakraToast.isActive,
  };
}

/**
 * Common toast messages for the application
 */
export const ToastMessages = {
  // Document operations
  documentUploaded: () => ({
    title: 'Document uploaded',
    description: 'Your PDF has been uploaded successfully',
    status: 'success' as const,
  }),
  documentDeleted: () => ({
    title: 'Document deleted',
    description: 'The document has been removed',
    status: 'success' as const,
  }),
  documentUploadFailed: () => ({
    title: 'Upload failed',
    description: 'Failed to upload document. Please try again.',
    status: 'error' as const,
  }),

  // Annotation operations
  annotationCreated: () => ({
    title: 'Annotation added',
    status: 'success' as const,
  }),
  annotationDeleted: () => ({
    title: 'Annotation removed',
    status: 'success' as const,
  }),
  annotationFailed: () => ({
    title: 'Annotation failed',
    description: 'Could not save annotation. Please try again.',
    status: 'error' as const,
  }),

  // Comment operations
  commentAdded: () => ({
    title: 'Comment added',
    status: 'success' as const,
  }),
  commentDeleted: () => ({
    title: 'Comment deleted',
    status: 'success' as const,
  }),
  commentResolved: () => ({
    title: 'Thread resolved',
    status: 'success' as const,
  }),

  // Sharing
  shareLinkCreated: () => ({
    title: 'Share link created',
    description: 'Link copied to clipboard',
    status: 'success' as const,
  }),
  shareLinkCopied: () => ({
    title: 'Link copied',
    description: 'Share link copied to clipboard',
    status: 'success' as const,
  }),

  // Export
  exportStarted: () => ({
    title: 'Exporting PDF',
    description: 'Your document is being prepared for download',
    status: 'info' as const,
  }),
  exportComplete: () => ({
    title: 'Export complete',
    description: 'Your PDF is ready for download',
    status: 'success' as const,
  }),
  exportFailed: () => ({
    title: 'Export failed',
    description: 'Could not export PDF. Please try again.',
    status: 'error' as const,
  }),

  // Real-time collaboration
  userJoined: (name: string) => ({
    title: `${name} joined`,
    description: `${name} is now viewing this document`,
    status: 'info' as const,
    duration: 3000,
  }),
  userLeft: (name: string) => ({
    title: `${name} left`,
    status: 'info' as const,
    duration: 3000,
  }),

  // Network
  connectionLost: () => ({
    title: 'Connection lost',
    description: 'Trying to reconnect...',
    status: 'warning' as const,
    duration: null,
  }),
  connectionRestored: () => ({
    title: 'Connection restored',
    description: 'You are back online',
    status: 'success' as const,
    duration: 3000,
  }),

  // Authentication
  loginSuccess: () => ({
    title: 'Welcome back!',
    status: 'success' as const,
  }),
  logoutSuccess: () => ({
    title: 'Logged out',
    description: 'You have been logged out successfully',
    status: 'success' as const,
  }),
  sessionExpired: () => ({
    title: 'Session expired',
    description: 'Please log in again',
    status: 'warning' as const,
  }),

  // Generic
  saveSuccess: () => ({
    title: 'Saved',
    description: 'Changes saved successfully',
    status: 'success' as const,
  }),
  saveFailed: () => ({
    title: 'Save failed',
    description: 'Could not save changes. Please try again.',
    status: 'error' as const,
  }),
  genericError: () => ({
    title: 'Something went wrong',
    description: 'Please try again later',
    status: 'error' as const,
  }),
};
