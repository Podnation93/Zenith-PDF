export type AccessLevel = 'view' | 'comment' | 'edit' | 'admin';

export type AnnotationType =
  | 'highlight'
  | 'comment'
  | 'sticky_note'
  | 'underline'
  | 'strikethrough'
  | 'drawing'
  | 'shape';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface Document {
  id: string;
  ownerId: string;
  filename: string;
  originalFilename: string;
  s3Key: string;
  s3Bucket: string;
  fileSizeBytes: number;
  pageCount: number | null;
  mimeType: string;
  checksumSha256: string | null;
  uploadDate: string;
  lastAccessedAt: string;
}

export interface Annotation {
  id: string;
  documentId: string;
  userId: string;
  annotationType: AnnotationType;
  pageNumber: number;
  crdtState: Record<string, unknown>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style?: {
    color?: string;
    thickness?: number;
    opacity?: number;
  };
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  annotationId: string | null;
  documentId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  mentionedUserIds: string[];
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PresenceUser {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  cursorPosition: { page: number; x: number; y: number } | null;
  activePage: number | null;
}

export interface WebSocketMessage {
  type: 'presence' | 'annotation' | 'comment' | 'cursor' | 'sync' | 'heartbeat' | 'connected';
  documentId?: string;
  userId?: string;
  payload?: any;
  timestamp?: number;
  connectionId?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
