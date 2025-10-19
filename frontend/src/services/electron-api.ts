/**
 * Electron API Wrapper
 *
 * This file wraps the Electron IPC API exposed via preload.ts
 * with a clean, type-safe interface that matches the previous REST API.
 *
 * This allows minimal changes to existing stores and components.
 */

import type { User, Document, Annotation, Comment, Activity } from '../types';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI;

if (!isElectron) {
  console.warn('Not running in Electron environment. API calls will fail.');
}

// ============================================================
// Authentication API
// ============================================================

export const authApi = {
  async register(credentials: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ user: User; token: string }> {
    const result = await window.electronAPI.auth.register(credentials);
    if (!result.success) {
      throw new Error(result.error || 'Registration failed');
    }
    return { user: result.user, token: result.token };
  },

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<{ user: User; token: string }> {
    const result = await window.electronAPI.auth.login(credentials);
    if (!result.success) {
      throw new Error(result.error || 'Login failed');
    }
    return { user: result.user, token: result.token };
  },

  async verify(token: string): Promise<User> {
    const result = await window.electronAPI.auth.verify(token);
    if (!result.success) {
      throw new Error('Invalid token');
    }
    return result.user;
  },
};

// ============================================================
// Document API
// ============================================================

export const documentApi = {
  async list(userId: string): Promise<Document[]> {
    const result = await window.electronAPI.documents.list(userId);
    if (!result.success) {
      throw new Error('Failed to fetch documents');
    }
    return result.documents;
  },

  async upload(file: File, userId: string, onProgress?: (progress: number) => void): Promise<Document> {
    // For Electron, we need to use the file selector first
    // This is a workaround since we can't directly access file paths from renderer
    const selectResult = await window.electronAPI.documents.selectFile();

    if (!selectResult.success) {
      throw new Error('File selection canceled');
    }

    const uploadResult = await window.electronAPI.documents.upload(
      userId,
      selectResult.filePath,
      selectResult.fileName
    );

    if (!uploadResult.success) {
      throw new Error('Upload failed');
    }

    return uploadResult.document;
  },

  async getById(documentId: string): Promise<Document & { fileData: string }> {
    const result = await window.electronAPI.documents.get(documentId);
    if (!result.success) {
      throw new Error('Document not found');
    }
    return result.document;
  },

  async delete(documentId: string, userId: string): Promise<void> {
    const result = await window.electronAPI.documents.delete(documentId, userId);
    if (!result.success) {
      throw new Error('Failed to delete document');
    }
  },

  async selectFile(): Promise<{ filePath: string; fileName: string } | null> {
    const result = await window.electronAPI.documents.selectFile();
    if (!result.success) {
      return null;
    }
    return {
      filePath: result.filePath,
      fileName: result.fileName,
    };
  },
};

// ============================================================
// Annotation API
// ============================================================

export const annotationApi = {
  async list(documentId: string): Promise<Annotation[]> {
    const result = await window.electronAPI.annotations.list(documentId);
    if (!result.success) {
      throw new Error('Failed to fetch annotations');
    }
    return result.annotations;
  },

  async create(
    documentId: string,
    userId: string,
    annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Annotation> {
    const result = await window.electronAPI.annotations.create(
      documentId,
      userId,
      annotation
    );
    if (!result.success) {
      throw new Error('Failed to create annotation');
    }
    return result.annotation;
  },

  async update(
    annotationId: string,
    updates: Partial<Pick<Annotation, 'position' | 'style' | 'content'>>
  ): Promise<void> {
    const result = await window.electronAPI.annotations.update(annotationId, updates);
    if (!result.success) {
      throw new Error('Failed to update annotation');
    }
  },

  async delete(annotationId: string, userId: string): Promise<void> {
    const result = await window.electronAPI.annotations.delete(annotationId, userId);
    if (!result.success) {
      throw new Error('Failed to delete annotation');
    }
  },
};

// ============================================================
// Comment API
// ============================================================

export const commentApi = {
  async list(annotationId: string): Promise<Comment[]> {
    const result = await window.electronAPI.comments.list(annotationId);
    if (!result.success) {
      throw new Error('Failed to fetch comments');
    }
    return result.comments;
  },

  async create(
    annotationId: string,
    userId: string,
    content: string
  ): Promise<Comment> {
    const result = await window.electronAPI.comments.create(
      annotationId,
      userId,
      content
    );
    if (!result.success) {
      throw new Error('Failed to create comment');
    }
    return result.comment;
  },

  async resolve(commentId: string): Promise<void> {
    const result = await window.electronAPI.comments.resolve(commentId);
    if (!result.success) {
      throw new Error('Failed to resolve comment');
    }
  },
};

// ============================================================
// Activity API
// ============================================================

export const activityApi = {
  async list(documentId: string): Promise<Activity[]> {
    const result = await window.electronAPI.activities.list(documentId);
    if (!result.success) {
      throw new Error('Failed to fetch activities');
    }
    return result.activities;
  },
};

// ============================================================
// App API
// ============================================================

export const appApi = {
  async getVersion(): Promise<string> {
    return await window.electronAPI.app.getVersion();
  },

  async getPath(name: 'userData' | 'documents'): Promise<string> {
    return await window.electronAPI.app.getPath(name);
  },
};

// ============================================================
// Type Declarations
// ============================================================

declare global {
  interface Window {
    electronAPI: {
      auth: {
        register: (credentials: any) => Promise<any>;
        login: (credentials: any) => Promise<any>;
        verify: (token: string) => Promise<any>;
      };
      documents: {
        list: (userId: string) => Promise<any>;
        upload: (userId: string, filePath: string, fileName: string) => Promise<any>;
        get: (documentId: string) => Promise<any>;
        delete: (documentId: string, userId: string) => Promise<any>;
        selectFile: () => Promise<any>;
      };
      annotations: {
        list: (documentId: string) => Promise<any>;
        create: (documentId: string, userId: string, annotation: any) => Promise<any>;
        update: (annotationId: string, updates: any) => Promise<any>;
        delete: (annotationId: string, userId: string) => Promise<any>;
      };
      comments: {
        list: (annotationId: string) => Promise<any>;
        create: (annotationId: string, userId: string, content: string) => Promise<any>;
        resolve: (commentId: string) => Promise<any>;
      };
      activities: {
        list: (documentId: string) => Promise<any>;
      };
      app: {
        getVersion: () => Promise<string>;
        getPath: (name: 'userData' | 'documents') => Promise<string>;
      };
    };
  }
}

// Export for backward compatibility with existing code
export default {
  auth: authApi,
  document: documentApi,
  annotation: annotationApi,
  comment: commentApi,
  activity: activityApi,
  app: appApi,
};
