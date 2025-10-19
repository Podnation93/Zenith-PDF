import { create } from 'zustand';
import { documentApi } from '../services/electron-api';
import { useAuthStore } from './auth.store';
import type { Document } from '../types';

interface DocumentState {
  documents: Document[];
  currentDocument: (Document & { fileData?: string }) | null;
  isLoading: boolean;
  error: string | null;

  fetchDocuments: () => Promise<void>;
  fetchDocument: (documentId: string) => Promise<void>;
  uploadDocument: (file: File) => Promise<Document>;
  deleteDocument: (documentId: string) => Promise<void>;
  clearError: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  currentDocument: null,
  isLoading: false,
  error: null,

  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const documents = await documentApi.list(userId);
      set({ documents, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch documents',
        isLoading: false,
      });
    }
  },

  fetchDocument: async (documentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const document = await documentApi.getById(documentId);
      set({ currentDocument: document, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch document',
        isLoading: false,
      });
    }
  },

  uploadDocument: async (file: File) => {
    set({ isLoading: true, error: null });
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const document = await documentApi.upload(file, userId);
      set((state) => ({
        documents: [document, ...state.documents],
        isLoading: false,
      }));
      return document;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to upload document',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteDocument: async (documentId: string) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      await documentApi.delete(documentId, userId);
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== documentId),
      }));
    } catch (error: any) {
      set({
        error: error.message || 'Failed to delete document',
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
