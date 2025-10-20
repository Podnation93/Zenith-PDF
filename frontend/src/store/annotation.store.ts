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
  | 'arrow'
  | 'signature';


interface AnnotationState {
  selectedSignature: string | null; // data URL

  // Actions
  setSelectedSignature: (dataUrl: string | null) => void;
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  selectedSignature: null,

  setSelectedSignature: (dataUrl) => set({ selectedSignature: dataUrl }),
}));