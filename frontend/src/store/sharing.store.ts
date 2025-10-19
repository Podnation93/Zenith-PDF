import { create } from 'zustand';
import { api } from '../services/api';

export type PermissionLevel = 'view' | 'comment' | 'edit';

export interface ShareLink {
  id: string;
  documentId: string;
  url: string;
  permissionLevel: PermissionLevel;
  expiresAt: string | null;
}

export interface DocumentPermission {
  id: string;
  user: {
    id: string;
    email: string;
  };
  permissionLevel: PermissionLevel;
}

interface SharingStoreState {
  links: ShareLink[];
  permissions: DocumentPermission[];
  isLoading: boolean;
  error: string | null;
}

interface SharingStoreActions {
  fetchSharingSettings: (documentId: string) => Promise<void>;
  createShareLink: (documentId: string, permissionLevel: PermissionLevel) => Promise<void>;
  revokeShareLink: (linkId: string) => Promise<void>;
  grantUserPermission: (documentId: string, email: string, permissionLevel: PermissionLevel) => Promise<void>;
  revokeUserPermission: (permissionId: string) => Promise<void>;
}

type SharingStore = SharingStoreState & SharingStoreActions;

export const useSharingStore = create<SharingStore>((set, get) => ({
  links: [],
  permissions: [],
  isLoading: false,
  error: null,

  fetchSharingSettings: async (documentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const [linksRes, permsRes] = await Promise.all([
        api.get(`/api/documents/${documentId}/share-links`),
        api.get(`/api/documents/${documentId}/permissions`),
      ]);
      set({ links: linksRes.data, permissions: permsRes.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch sharing settings:', error);
      set({ isLoading: false, error: 'Failed to load sharing settings.' });
    }
  },

  createShareLink: async (documentId: string, permissionLevel: PermissionLevel) => {
    try {
      const { data: newLink } = await api.post(`/api/documents/${documentId}/share-links`, { permissionLevel });
      set(state => ({ links: [...state.links, newLink] }));
    } catch (error) {
      console.error('Failed to create share link:', error);
      // Propagate error to UI
      throw error;
    }
  },

  revokeShareLink: async (linkId: string) => {
    try {
      await api.delete(`/api/share-links/${linkId}`);
      set(state => ({ links: state.links.filter(link => link.id !== linkId) }));
    } catch (error) {
      console.error('Failed to revoke share link:', error);
      throw error;
    }
  },

  grantUserPermission: async (documentId: string, email: string, permissionLevel: PermissionLevel) => {
    try {
      const { data: newPermission } = await api.post(`/api/documents/${documentId}/permissions`, { email, permissionLevel });
      set(state => ({ permissions: [...state.permissions, newPermission] }));
    } catch (error) {
      console.error('Failed to grant permission:', error);
      throw error;
    }
  },

  revokeUserPermission: async (permissionId: string) => {
    try {
      await api.delete(`/api/permissions/${permissionId}`);
      set(state => ({ permissions: state.permissions.filter(p => p.id !== permissionId) }));
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      throw error;
    }
  },
}));
