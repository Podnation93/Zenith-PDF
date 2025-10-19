import axios from 'axios';
import type { AuthResponse, User, Document, Annotation, Comment } from '../types';
import { retryRequest, getErrorMessage, isRetryableError } from '../utils/apiRetry';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Track retry attempts for logging
let retryCount = 0;

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // Enhance error with user-friendly message
    const enhancedError = {
      ...error,
      userMessage: getErrorMessage(error),
      isRetryable: isRetryableError(error),
    };

    return Promise.reject(enhancedError);
  }
);

/**
 * Wrapper for API calls with automatic retry logic for non-critical operations
 * @param requestFn - Function that returns a Promise
 * @param options - Retry options
 * @returns Promise with the request result
 */
export async function apiCallWithRetry<T>(
  requestFn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
  }
): Promise<T> {
  return retryRequest(requestFn, {
    maxRetries: options?.maxRetries ?? 3,
    retryDelay: options?.retryDelay ?? 1000,
    onRetry: (attempt, error) => {
      if (import.meta.env.DEV) {
        console.log(`Retrying API call (attempt ${attempt}):`, error.config?.url);
      }
    },
  });
}

// Auth API
export const authApi = {
  register: async (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<{ user: User }>('/auth/me');
    return response.data.user;
  },

  updateProfile: async (data: Partial<Pick<User, 'firstName' | 'lastName' | 'avatarUrl'>>): Promise<User> => {
    const response = await api.patch<{ user: User }>('/auth/me', data);
    return response.data.user;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// Document API
export const documentApi = {
  upload: async (file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ document: Document }>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.document;
  },

  getAll: async (): Promise<Document[]> => {
    return apiCallWithRetry(async () => {
      const response = await api.get<{ documents: Document[] }>('/documents');
      return response.data.documents;
    });
  },

  getById: async (documentId: string): Promise<Document> => {
    return apiCallWithRetry(async () => {
      const response = await api.get<{ document: Document }>(`/documents/${documentId}`);
      return response.data.document;
    });
  },

  getDownloadUrl: async (documentId: string): Promise<string> => {
    return apiCallWithRetry(async () => {
      const response = await api.get<{ url: string }>(`/documents/${documentId}/download`);
      return response.data.url;
    });
  },

  delete: async (documentId: string): Promise<void> => {
    await api.delete(`/documents/${documentId}`);
  },

  createShareLink: async (
    documentId: string,
    data: {
      accessLevel: 'view' | 'comment';
      expiresAt?: string;
      password?: string;
      maxUses?: number;
    }
  ) => {
    const response = await api.post(`/documents/${documentId}/share`, data);
    return response.data.shareLink;
  },
};

// Annotation API
export const annotationApi = {
  create: async (
    documentId: string,
    data: {
      annotationType: Annotation['annotationType'];
      pageNumber: number;
      position: Annotation['position'];
      style?: Annotation['style'];
      content?: string;
    }
  ): Promise<Annotation> => {
    const response = await api.post<{ annotation: Annotation }>(
      `/documents/${documentId}/annotations`,
      data
    );
    return response.data.annotation;
  },

  getAll: async (documentId: string, page?: number): Promise<Annotation[]> => {
    const params = page !== undefined ? { page } : {};
    const response = await api.get<{ annotations: Annotation[] }>(
      `/documents/${documentId}/annotations`,
      { params }
    );
    return response.data.annotations;
  },

  update: async (
    documentId: string,
    annotationId: string,
    data: Partial<Pick<Annotation, 'position' | 'style' | 'content'>>
  ): Promise<Annotation> => {
    const response = await api.patch<{ annotation: Annotation }>(
      `/documents/${documentId}/annotations/${annotationId}`,
      data
    );
    return response.data.annotation;
  },

  delete: async (documentId: string, annotationId: string): Promise<void> => {
    await api.delete(`/documents/${documentId}/annotations/${annotationId}`);
  },
};

// Comment API
export const commentApi = {
  create: async (
    documentId: string,
    data: {
      annotationId?: string;
      parentCommentId?: string;
      content: string;
      mentionedUserIds?: string[];
    }
  ): Promise<Comment> => {
    const response = await api.post<{ comment: Comment }>(
      `/documents/${documentId}/comments`,
      data
    );
    return response.data.comment;
  },

  getAll: async (documentId: string): Promise<Comment[]> => {
    const response = await api.get<{ comments: Comment[] }>(
      `/documents/${documentId}/comments`
    );
    return response.data.comments;
  },

  update: async (documentId: string, commentId: string, content: string): Promise<Comment> => {
    const response = await api.patch<{ comment: Comment }>(
      `/documents/${documentId}/comments/${commentId}`,
      { content }
    );
    return response.data.comment;
  },

  resolve: async (documentId: string, commentId: string, resolved: boolean): Promise<Comment> => {
    const response = await api.patch<{ comment: Comment }>(
      `/documents/${documentId}/comments/${commentId}/resolve`,
      { resolved }
    );
    return response.data.comment;
  },

  delete: async (documentId: string, commentId: string): Promise<void> => {
    await api.delete(`/documents/${documentId}/comments/${commentId}`);
  },
};
