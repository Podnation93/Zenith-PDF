import { create } from 'zustand';
import { documentApi } from '../services/api';
import type { Document } from '../types';

interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  isLoading: boolean;
  error: string | null;

  fetchDocuments: () => Promise<void>;
  fetchDocument: (documentId: string) => Promise<void>;
  uploadDocument: (file: File) => Promise<Document>;
  deleteDocument: (documentId: string) => Promise<void>;
  clearError: () => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  currentDocument: null,
  isLoading: false,
  error: null,

  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const documents = await documentApi.getAll();
      set({ documents, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch documents',
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
        error: error.response?.data?.error || 'Failed to fetch document',
        isLoading: false,
      });
    }
  },

  uploadDocument: async (file: File) => {
    set({ isLoading: true, error: null });
    try {
      const document = await documentApi.upload(file);
      set((state) => ({
        documents: [document, ...state.documents],
        isLoading: false,
      }));
      return document;
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to upload document',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteDocument: async (documentId: string) => {
    try {
      await documentApi.delete(documentId);
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== documentId),
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to delete document',
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
