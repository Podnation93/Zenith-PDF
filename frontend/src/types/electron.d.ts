// Type definitions for Electron IPC API

export interface ElectronAPI {
  auth: {
    register: (credentials: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }) => Promise<{
      success: boolean;
      user?: any;
      token?: string;
      error?: string;
    }>;
    login: (credentials: {
      email: string;
      password: string;
    }) => Promise<{
      success: boolean;
      user?: any;
      token?: string;
      error?: string;
    }>;
    verify: (data: { token: string }) => Promise<{
      success: boolean;
      user?: any;
      error?: string;
    }>;
  };
  documents: {
    list: (userId: string) => Promise<{
      success: boolean;
      documents?: any[];
      error?: string;
    }>;
    get: (documentId: string) => Promise<{
      success: boolean;
      document?: any;
      fileData?: string;
      error?: string;
    }>;
    upload: (userId: string, filePath: string, fileName: string) => Promise<{
      success: boolean;
      document?: any;
      error?: string;
    }>;
    delete: (documentId: string) => Promise<{
      success: boolean;
      error?: string;
    }>;
  };
  annotations: {
    list: (documentId: string) => Promise<{
      success: boolean;
      annotations?: any[];
      error?: string;
    }>;
    create: (data: any) => Promise<{
      success: boolean;
      annotation?: any;
      error?: string;
    }>;
    update: (annotationId: string, data: any) => Promise<{
      success: boolean;
      annotation?: any;
      error?: string;
    }>;
    delete: (annotationId: string) => Promise<{
      success: boolean;
      error?: string;
    }>;
  };
  comments: {
    list: (annotationId: string) => Promise<{
      success: boolean;
      comments?: any[];
      error?: string;
    }>;
    create: (data: any) => Promise<{
      success: boolean;
      comment?: any;
      error?: string;
    }>;
    update: (commentId: string, data: any) => Promise<{
      success: boolean;
      comment?: any;
      error?: string;
    }>;
    delete: (commentId: string) => Promise<{
      success: boolean;
      error?: string;
    }>;
  };
  activities: {
    list: (documentId: string) => Promise<{
      success: boolean;
      activities?: any[];
      error?: string;
    }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
