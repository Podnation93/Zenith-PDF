import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { api } from '../services/api';
import {
  cacheAnnotations,
  getCachedAnnotations,
  addToSyncQueue,
} from '../services/db';
import { requestSync } from '../registerServiceWorker';
import { v4 as uuidv4 } from 'uuid';
import {
  cacheAnnotations,
  getCachedAnnotations,
  addToSyncQueue,
} from '../services/db';

// ... (interface definitions are the same)

// ...

  fetchAnnotations: async (documentId: string) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Load from cache first
      const cachedAnnotations = await getCachedAnnotations(documentId);
      if (cachedAnnotations.length > 0) {
        set({ annotations: cachedAnnotations });
      }

      // 2. Fetch from network
      const response = await api.get(`/api/documents/${documentId}/annotations`);
      const freshAnnotations = response.data;

      // 3. Update state and cache
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

    // Optimistically update UI
    set((state) => ({
      annotations: [...state.annotations, newAnnotation],
    }));

import { requestSync } from '../registerServiceWorker';

// ...

    if (!navigator.onLine) {
      console.log('Offline, adding to sync queue.');
      await addToSyncQueue({ type: 'createAnnotation', payload: { documentId, annotationData } });
      requestSync(); // Request a background sync
      return newAnnotation;
    }

//...

    try {
      const response = await api.post(
        `/api/documents/${documentId}/annotations`,
        annotationData
      );
      const savedAnnotation = response.data;

      // Replace optimistic annotation with confirmed one from server
      set(state => ({
        annotations: state.annotations.map(a => a.id === tempId ? savedAnnotation : a)
      }));

      return savedAnnotation;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create annotation' });
      // Revert optimistic update on failure if needed, or add to sync queue
      await addToSyncQueue({ type: 'createAnnotation', payload: { documentId, annotationData } });
      throw error;
    }
  }

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
