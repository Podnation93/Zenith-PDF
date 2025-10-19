import { create } from 'zustand';
import { api } from '../services/api';

export interface Annotation {
  id: string;
  documentId: string;
  type: 'highlight' | 'comment' | 'sticky_note';
  pageNumber: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  content?: string;
  color: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

interface AnnotationState {
  annotations: Annotation[];
  selectedTool: 'select' | 'highlight' | 'comment' | 'sticky_note' | null;
  selectedColor: string;
  selectedAnnotation: Annotation | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSelectedTool: (tool: 'select' | 'highlight' | 'comment' | 'sticky_note' | null) => void;
  setSelectedColor: (color: string) => void;
  setSelectedAnnotation: (annotation: Annotation | null) => void;

  // API Actions
  fetchAnnotations: (documentId: string) => Promise<void>;
  createAnnotation: (documentId: string, annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<Annotation>;
  updateAnnotation: (documentId: string, annotationId: string, updates: Partial<Annotation>) => Promise<void>;
  deleteAnnotation: (documentId: string, annotationId: string) => Promise<void>;
  clearAnnotations: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  annotations: [],
  selectedTool: null,
  selectedColor: '#FFEB3B', // Yellow default
  selectedAnnotation: null,
  isLoading: false,
  error: null,

  setSelectedTool: (tool) => set({ selectedTool: tool }),

  setSelectedColor: (color) => set({ selectedColor: color }),

  setSelectedAnnotation: (annotation) => set({ selectedAnnotation: annotation }),

  fetchAnnotations: async (documentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/documents/${documentId}/annotations`);
      set({ annotations: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch annotations', isLoading: false });
      throw error;
    }
  },

  createAnnotation: async (documentId, annotationData) => {
    set({ error: null });
    try {
      const response = await api.post(
        `/api/documents/${documentId}/annotations`,
        annotationData
      );
      const newAnnotation = response.data;
      set((state) => ({
        annotations: [...state.annotations, newAnnotation],
      }));
      return newAnnotation;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create annotation' });
      throw error;
    }
  },

  updateAnnotation: async (documentId, annotationId, updates) => {
    set({ error: null });
    try {
      const response = await api.patch(
        `/api/documents/${documentId}/annotations/${annotationId}`,
        updates
      );
      set((state) => ({
        annotations: state.annotations.map((ann) =>
          ann.id === annotationId ? { ...ann, ...response.data } : ann
        ),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to update annotation' });
      throw error;
    }
  },

  deleteAnnotation: async (documentId, annotationId) => {
    set({ error: null });
    try {
      await api.delete(`/api/documents/${documentId}/annotations/${annotationId}`);
      set((state) => ({
        annotations: state.annotations.filter((ann) => ann.id !== annotationId),
        selectedAnnotation:
          state.selectedAnnotation?.id === annotationId ? null : state.selectedAnnotation,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete annotation' });
      throw error;
    }
  },

  clearAnnotations: () => set({ annotations: [], selectedAnnotation: null }),
}));
