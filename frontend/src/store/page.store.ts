import { create } from 'zustand';
import { api } from '../services/api';

export interface Page {
  pageNumber: number;
  thumbnailUrl?: string; // Optional: for generating thumbnails on the backend
}

interface PageStoreState {
  pages: Page[];
  isLoading: boolean;
  error: string | null;
}

interface PageStoreActions {
  initializePages: (totalPages: number) => void;
  reorderPages: (startIndex: number, endIndex: number) => void;
  deletePage: (pageNumber: number) => Promise<void>;
  savePageOrder: (documentId: string) => Promise<void>;
}

type PageStore = PageStoreState & PageStoreActions;

export const usePageStore = create<PageStore>((set, get) => ({
  pages: [],
  isLoading: false,
  error: null,

  initializePages: (totalPages: number) => {
    const initialPages = Array.from({ length: totalPages }, (_, i) => ({ pageNumber: i + 1 }));
    set({ pages: initialPages });
  },

  reorderPages: (startIndex: number, endIndex: number) => {
    const result = Array.from(get().pages);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    set({ pages: result });
  },

  deletePage: async (pageNumber: number) => {
    // Optimistic update
    const originalPages = get().pages;
    set(state => ({ pages: state.pages.filter(p => p.pageNumber !== pageNumber) }));

    try {
      // This API endpoint would need to be created on the backend
      // await api.delete(`/api/documents/${documentId}/pages/${pageNumber}`);
      console.log(`(Simulated) Deleted page ${pageNumber}`);
    } catch (error) {
      console.error('Failed to delete page:', error);
      set({ pages: originalPages }); // Rollback on failure
      // show toast
    }
  },

  savePageOrder: async (documentId: string) => {
    const { pages } = get();
    const pageOrder = pages.map(p => p.pageNumber);
    try {
      // This API endpoint would need to be created on the backend
      // await api.patch(`/api/documents/${documentId}/page-order`, { pageOrder });
      console.log('(Simulated) Saved new page order:', pageOrder);
    } catch (error) {
      console.error('Failed to save page order:', error);
      // show toast
    }
  },
}));
