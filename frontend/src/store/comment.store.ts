
import { create } from 'zustand';
import { api } from '../services/api';
import { Annotation } from '../types';
import { websocketService } from '../services/websocket';
import type { WebSocketMessage } from '../types';

// As per backend schema:
export interface Comment {
  id: string;
  content: string;
  userId: string;
  annotationId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  // Potentially populated from a JOIN query on the backend
  author?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

interface CommentThread {
  annotation: Annotation;
  comments: Comment[];
}

interface CommentStoreState {
  selectedAnnotationId: string | null;
  threads: Record<string, CommentThread>;
  isLoading: boolean;
  error: string | null;
}

import { websocketService } from '../services/websocket';
import { WebSocketMessage } from '../types';

interface CommentStoreActions {
  initializeSocketListeners: () => void;
  setSelectedAnnotationId: (annotationId: string | null) => Promise<void>;
  addComment: (annotationId: string, content: string, parentId?: string) => Promise<void>;
  resolveThread: (annotationId: string) => Promise<void>;
  clearComments: () => void;
}

type CommentStore = CommentStoreState & CommentStoreActions;

export const useCommentStore = create<CommentStore>((set, get) => ({
  selectedAnnotationId: null,
  threads: {},
  isLoading: false,
  error: null,

  initializeSocketListeners: () => {
    websocketService.onMessage((message: WebSocketMessage) => {
      if (message.type === 'comment' && message.payload.action === 'create') {
        const newComment = message.payload.comment as Comment;
        const { annotationId } = newComment;

        set((state) => {
          const threadExists = state.threads[annotationId];
          if (!threadExists) return {}; // Don't update if thread not in view

          // Avoid adding duplicate comment if we were the sender
          if (state.threads[annotationId].comments.some(c => c.id === newComment.id)) {
            return {};
          }

          return {
            threads: {
              ...state.threads,
              [annotationId]: {
                ...state.threads[annotationId],
                comments: [...state.threads[annotationId].comments, newComment],
              },
            },
          };
        });
      }
    });
  },

  setSelectedAnnotationId: async (annotationId: string | null) => {
    if (!annotationId) {
      set({ selectedAnnotationId: null });
      return;
    }

    set({ selectedAnnotationId: annotationId, isLoading: true, error: null });

    try {
      const { data: threadData } = await api.get<CommentThread>(`/api/annotations/${annotationId}/thread`);
      set((state) => ({
        threads: {
          ...state.threads,
          [annotationId]: threadData,
        },
        isLoading: false,
      }));
    } catch (error) {
      console.error("Failed to fetch comment thread:", error);
      set({ isLoading: false, error: `Failed to load comments for annotation ${annotationId}.` });
    }
  },

  addComment: async (annotationId: string, content: string, parentId?: string) => {
    try {
      // The backend will persist this and broadcast it via WebSocket.
      // The local user will receive their own message back via the socket listener,
      // which serves as confirmation and ensures a single source of truth for updates.
      const { data: newComment } = await api.post<Comment>(`/api/annotations/${annotationId}/comments`, {
        content,
        parentId,
      });

      // The websocket listener will handle adding the comment to the state.
      // This prevents duplicate comments.

    } catch (error) {
      console.error("Failed to add comment:", error);
      // Optionally, set an error state to be displayed in the UI
    }
  },

  resolveThread: async (annotationId: string) => {
    // This action will likely update the annotation's status to "resolved"
    // and maybe hide it from the main comment view.
    try {
      // Assuming an endpoint exists to update the annotation status
      await api.patch(`/api/annotations/${annotationId}`, { status: 'resolved' });

      set((state) => {
        const newThreads = { ...state.threads };
        if (newThreads[annotationId]) {
          newThreads[annotationId].annotation.status = 'resolved';
        }
        return {
          threads: newThreads,
          selectedAnnotationId: state.selectedAnnotationId === annotationId ? null : state.selectedAnnotationId,
        };
      });
    } catch (error) {
      console.error("Failed to resolve thread:", error);
    }
  },

  clearComments: () => set({ threads: {}, selectedAnnotationId: null }),
}));
