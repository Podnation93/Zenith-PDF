import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { api } from '../services/api';
import {
  cacheAnnotations,
  getCachedAnnotations,
  addToSyncQueue,
} from '../services/db';
import { requestSync } from '../registerServiceWorker';

export type AnnotationType = 
  | 'highlight' 
  | 'comment' 
  | 'sticky_note' 
  | 'underline' 
  | 'strikethrough' 
  | 'freehand' 
  | 'rectangle' 
  | 'ellipse' 
  | 'arrow';

export interface Annotation {
  id: string;
  documentId: string;
  type: AnnotationType;
  pageNumber: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  content?: string;
  color: string;
  strokeWidth?: number;
  opacity?: number;
  points?: number[][]; // For freehand drawing
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

interface AnnotationState {
  annotations: Annotation[];
  selectedTool: AnnotationType | 'select' | null;
  selectedColor: string;
  strokeWidth: number;
  opacity: number;
  selectedAnnotation: Annotation | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSelectedTool: (tool: AnnotationType | 'select' | null) => void;
  setSelectedColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
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
  strokeWidth: 5,
  opacity: 1,
  selectedAnnotation: null,
  isLoading: false,
  error: null,

  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedColor: (color) => set({ selectedColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setOpacity: (opacity) => set({ opacity: opacity }),
  setSelectedAnnotation: (annotation) => set({ selectedAnnotation: annotation }),

  fetchAnnotations: async (documentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const cachedAnnotations = await getCachedAnnotations(documentId);
      if (cachedAnnotations.length > 0) {
        set({ annotations: cachedAnnotations });
      }
      const response = await api.get(`/api/documents/${documentId}/annotations`);
      const freshAnnotations = response.data;
      set({ annotations: freshAnnotations, isLoading: false });
      await cacheAnnotations(freshAnnotations);
    } catch (error: any) {
      console.warn('Fetch from network failed, relying on cache.', error);
      set({ isLoading: false, error: 'Could not fetch latest annotations.' });
    }
  },

  createAnnotation: async (documentId, annotationData) => {
    set({ error: null });
    const tempId = `offline-${uuidv4()}`;
    const newAnnotation = {
      ...annotationData,
      id: tempId,
      documentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Annotation;

    set((state) => ({
      annotations: [...state.annotations, newAnnotation],
    }));

    if (!navigator.onLine) {
      console.log('Offline, adding to sync queue.');
      await addToSyncQueue({ type: 'createAnnotation', payload: { documentId, annotationData } });
      requestSync();
      return newAnnotation;
    }

    try {
      const response = await api.post(
        `/api/documents/${documentId}/annotations`,
        annotationData
      );
      const savedAnnotation = response.data;
      set(state => ({
        annotations: state.annotations.map(a => a.id === tempId ? savedAnnotation : a)
      }));
      return savedAnnotation;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create annotation' });
      await addToSyncQueue({ type: 'createAnnotation', payload: { documentId, annotationData } });
      requestSync();
      throw error;
    }
  },

  updateAnnotation: async (documentId, annotationId, updates) => {
    // TODO: Offline handling
  },

  deleteAnnotation: async (documentId, annotationId) => {
    // TODO: Offline handling
  },

  clearAnnotations: () => set({ annotations: [], selectedAnnotation: null }),
}));