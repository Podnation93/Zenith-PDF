import { create } from 'zustand';

interface SignatureStoreState {
  signatures: string[]; // Array of data URLs
  addSignature: (dataUrl: string) => void;
  deleteSignature: (index: number) => void;
}

const SIGNATURES_STORAGE_KEY = 'zenith-pdf-signatures';

const getInitialSignatures = (): string[] => {
  try {
    const saved = localStorage.getItem(SIGNATURES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to load signatures from local storage:', error);
    return [];
  }
};

export const useSignatureStore = create<SignatureStoreState>((set) => ({
  signatures: getInitialSignatures(),

  addSignature: (dataUrl: string) => {
    set(state => {
      const newSignatures = [...state.signatures, dataUrl];
      try {
        localStorage.setItem(SIGNATURES_STORAGE_KEY, JSON.stringify(newSignatures));
      } catch (error) {
        console.error('Failed to save signatures to local storage:', error);
      }
      return { signatures: newSignatures };
    });
  },

  deleteSignature: (index: number) => {
    set(state => {
      const newSignatures = state.signatures.filter((_, i) => i !== index);
      try {
        localStorage.setItem(SIGNATURES_STORAGE_KEY, JSON.stringify(newSignatures));
      } catch (error) {
        console.error('Failed to save signatures to local storage:', error);
      }
      return { signatures: newSignatures };
    });
  },
}));
