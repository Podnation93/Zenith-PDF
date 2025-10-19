export type AccessLevel = 'view' | 'comment' | 'edit' | 'admin';

export type AnnotationType =
  | 'highlight'
  | 'comment'
  | 'sticky_note'
  | 'underline'
  | 'strikethrough'
  | 'drawing'
  | 'shape'
  | 'text_edit'
  | 'image_edit';

export type NotificationType =
  | 'mention'
  | 'comment_reply'
  | 'document_shared'
  | 'annotation_added'
  | 'comment_resolved';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
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
  uploadDate: Date;
  lastAccessedAt: Date;
}

export interface Permission {
  id: string;
  documentId: string;
  userId: string;
  accessLevel: AccessLevel;
  grantedBy: string | null;
  grantedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

export interface ShareLink {
  id: string;
  documentId: string;
  createdBy: string;
  shareToken: string;
  accessLevel: AccessLevel;
  passwordHash: string | null;
  maxUses: number | null;
  useCount: number;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
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
    font?: string;
  };
  content?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
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
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ActiveSession {
  id: string;
  userId: string;
  documentId: string;
  connectionId: string;
  cursorPosition: {
    page: number;
    x: number;
    y: number;
  } | null;
  activePage: number | null;
  connectedAt: Date;
  lastHeartbeat: Date;
  disconnectedAt: Date | null;
}

export interface WebSocketMessage {
  type: 'presence' | 'annotation' | 'comment' | 'cursor' | 'sync' | 'heartbeat';
  documentId: string;
  userId: string;
  payload: unknown;
  timestamp: number;
}

export interface PresencePayload {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  cursorPosition: { page: number; x: number; y: number } | null;
  activePage: number | null;
  action: 'join' | 'leave' | 'update';
}

export interface AnnotationPayload {
  annotationId: string;
  action: 'create' | 'update' | 'delete';
  annotation?: Partial<Annotation>;
  crdtUpdate?: Uint8Array;
}

export interface CommentPayload {
  commentId: string;
  action: 'create' | 'update' | 'delete' | 'resolve';
  comment?: Partial<Comment>;
}

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// API Request/Response types
export interface CreateDocumentRequest {
  filename: string;
}

export interface ShareDocumentRequest {
  documentId: string;
  accessLevel: AccessLevel;
  expiresAt?: Date;
  password?: string;
}

export interface CreateAnnotationRequest {
  documentId: string;
  annotationType: AnnotationType;
  pageNumber: number;
  position: Annotation['position'];
  style?: Annotation['style'];
  content?: string;
}

export interface CreateCommentRequest {
  documentId: string;
  annotationId?: string;
  parentCommentId?: string;
  content: string;
  mentionedUserIds?: string[];
}
