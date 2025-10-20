import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  auth: {
    register: (credentials: { email: string; password: string; firstName?: string; lastName?: string }) =>
      ipcRenderer.invoke('auth:register', credentials),
    login: (credentials: { email: string; password: string }) =>
      ipcRenderer.invoke('auth:login', credentials),
    verify: (token: string) =>
      ipcRenderer.invoke('auth:verify', { token }),
    validatePassword: (password: string, userInputs?: string[]) =>
      ipcRenderer.invoke('auth:validate-password', { password, userInputs }),
  },

  // Documents
  documents: {
    list: (userId: string) =>
      ipcRenderer.invoke('documents:list', { userId }),
    upload: (userId: string, filePath: string, fileName: string) =>
      ipcRenderer.invoke('documents:upload', { userId, filePath, fileName }),
    get: (documentId: string) =>
      ipcRenderer.invoke('documents:get', { documentId }),
    delete: (documentId: string, userId: string) =>
      ipcRenderer.invoke('documents:delete', { documentId, userId }),
    selectFile: () =>
      ipcRenderer.invoke('documents:select-file'),
  },

  // Annotations
  annotations: {
    list: (documentId: string) =>
      ipcRenderer.invoke('annotations:list', { documentId }),
    create: (documentId: string, userId: string, annotation: any) =>
      ipcRenderer.invoke('annotations:create', { documentId, userId, annotation }),
    update: (annotationId: string, updates: any) =>
      ipcRenderer.invoke('annotations:update', { annotationId, updates }),
    delete: (annotationId: string, userId: string) =>
      ipcRenderer.invoke('annotations:delete', { annotationId, userId }),
  },

  // Comments
  comments: {
    list: (annotationId: string) =>
      ipcRenderer.invoke('comments:list', { annotationId }),
    create: (annotationId: string, userId: string, content: string) =>
      ipcRenderer.invoke('comments:create', { annotationId, userId, content }),
    resolve: (commentId: string) =>
      ipcRenderer.invoke('comments:resolve', { commentId }),
  },

  // Activities
  activities: {
    list: (documentId: string) =>
      ipcRenderer.invoke('activities:list', { documentId }),
  },

  // App
  app: {
    getVersion: () =>
      ipcRenderer.invoke('app:get-version'),
    getPath: (name: 'userData' | 'documents') =>
      ipcRenderer.invoke('app:get-path', name),
  },

  // Auto-save
  autosave: {
    forceSave: () =>
      ipcRenderer.invoke('autosave:force-save'),
    getStatus: () =>
      ipcRenderer.invoke('autosave:get-status'),
    setEnabled: (enabled: boolean) =>
      ipcRenderer.invoke('autosave:set-enabled', { enabled }),
    setInterval: (intervalMs: number) =>
      ipcRenderer.invoke('autosave:set-interval', { intervalMs }),
  },

  // Export
  export: {
    withAnnotations: (documentId: string, outputPath?: string) =>
      ipcRenderer.invoke('export:with-annotations', { documentId, outputPath }),
    annotationsSummary: (documentId: string, outputPath?: string) =>
      ipcRenderer.invoke('export:annotations-summary', { documentId, outputPath }),
    selectOutputPath: () =>
      ipcRenderer.invoke('export:select-output-path'),
  },
});

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: {
      auth: {
        register: (credentials: { email: string; password: string; firstName?: string; lastName?: string }) => Promise<any>;
        login: (credentials: { email: string; password: string }) => Promise<any>;
        verify: (token: string) => Promise<any>;
        validatePassword: (password: string, userInputs?: string[]) => Promise<any>;
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
      autosave: {
        forceSave: () => Promise<any>;
        getStatus: () => Promise<any>;
        setEnabled: (enabled: boolean) => Promise<any>;
        setInterval: (intervalMs: number) => Promise<any>;
      };
      export: {
        withAnnotations: (documentId: string, outputPath?: string) => Promise<any>;
        annotationsSummary: (documentId: string, outputPath?: string) => Promise<any>;
        selectOutputPath: () => Promise<any>;
      };
    };
  }
}
