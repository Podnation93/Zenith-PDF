# Zenith PDF - Integration Guide

**Version:** 2.0 Enhanced
**Date:** 2025-10-19
**For:** Developers

---

## Overview

This guide provides comprehensive integration examples for developers working with Zenith PDF. Learn how to integrate components, utilize services, work with stores, and extend functionality.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Component Integration](#component-integration)
3. [Store Integration](#store-integration)
4. [Service Integration](#service-integration)
5. [Hook Integration](#hook-integration)
6. [Real-Time Features](#real-time-features)
7. [Custom Annotation Types](#custom-annotation-types)
8. [Extending Functionality](#extending-functionality)
9. [API Integration](#api-integration)
10. [Best Practices](#best-practices)

---

## Quick Start

### Prerequisites

```bash
# Node.js 20+
node --version

# npm or yarn
npm --version

# Git
git --version
```

### Installation

```bash
# Clone repository
git clone https://github.com/yourorg/zenith-pdf.git
cd zenith-pdf

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### Development Environment

```bash
# Start backend (terminal 1)
cd backend
npm run dev

# Start frontend (terminal 2)
cd frontend
npm run dev

# Open browser
# Navigate to http://localhost:5173
```

---

## Component Integration

### 1. Presence Indicators

**Show active users viewing a document**

```tsx
import { PresenceIndicator } from '@/components/PresenceIndicator';
import { usePresenceStore } from '@/store/presence.store';
import { useEffect } from 'react';

function DocumentHeader({ documentId }: { documentId: string }) {
  const { initialize, clearPresence } = usePresenceStore();

  useEffect(() => {
    // Initialize presence tracking when component mounts
    initialize();

    // Cleanup on unmount
    return () => {
      clearPresence();
    };
  }, [initialize, clearPresence]);

  return (
    <header className="document-header">
      <h1>Document Title</h1>

      {/* Shows up to 5 user avatars */}
      <PresenceIndicator
        maxAvatars={5}
        showNames={false}
      />
    </header>
  );
}
```

**Alternative: Presence Count Badge**

```tsx
import { PresenceCount } from '@/components/PresenceIndicator';

function Sidebar() {
  return (
    <div className="sidebar">
      <h2>Viewers</h2>
      <PresenceCount />
      {/* Shows "5 online" when 5 users are viewing */}
    </div>
  );
}
```

**Alternative: Active User List**

```tsx
import { ActiveUserList } from '@/components/PresenceIndicator';

function CollaborationPanel() {
  return (
    <div className="panel">
      <h2>Active Users</h2>
      {/* Detailed list with avatars and status */}
      <ActiveUserList />
    </div>
  );
}
```

### 2. Cursor Tracking

**Show real-time cursors of collaborators**

```tsx
import { CursorTracker } from '@/components/CursorTracker';
import { useRef, useState } from 'react';

function PDFViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);

  return (
    <div ref={containerRef} className="pdf-container">
      {/* Your PDF rendering component */}
      <PDFContent
        page={currentPage}
        zoom={zoomLevel}
      />

      {/* Cursor tracking overlay */}
      <CursorTracker
        currentPage={currentPage}
        containerRef={containerRef}
        scale={zoomLevel}
      />
    </div>
  );
}
```

**Alternative: Avatar Cursors**

```tsx
import { AvatarCursorTracker } from '@/components/CursorTracker';

// Shows user avatars instead of pointer cursors
<AvatarCursorTracker
  currentPage={currentPage}
  containerRef={containerRef}
  scale={zoomLevel}
/>
```

### 3. Sharing Modal

**Allow users to share documents**

```tsx
import { EnhancedSharingModal } from '@/components/EnhancedSharingModal';
import { useDisclosure } from '@chakra-ui/react';

function DocumentToolbar({ documentId, documentName }: Props) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <button onClick={onOpen}>
        Share Document
      </button>

      <EnhancedSharingModal
        isOpen={isOpen}
        onClose={onClose}
        documentId={documentId}
        documentName={documentName}
      />
    </>
  );
}
```

### 4. Activity Feed

**Display document activity**

```tsx
import { ActivityFeedSidebar } from '@/components/ActivityFeedSidebar';
import { useActivityStore } from '@/store/activity.store';
import { useEffect } from 'react';

function DocumentPage({ documentId }: Props) {
  const { fetchActivities } = useActivityStore();

  useEffect(() => {
    // Load activities when document opens
    fetchActivities(documentId);
  }, [documentId, fetchActivities]);

  return (
    <div className="document-layout">
      <main>{/* Document viewer */}</main>

      <aside>
        <ActivityFeedSidebar />
      </aside>
    </div>
  );
}
```

### 5. Connection Status

**Show connection status to users**

```tsx
import {
  ConnectionStatusBanner,
  ConnectionStatusBadge,
  useConnectionStatus
} from '@/components/ConnectionStatus';

function App() {
  const { isOnline, isOffline } = useConnectionStatus();

  return (
    <div className="app">
      {/* Fixed banner at top - shows when offline */}
      <ConnectionStatusBanner />

      <header>
        <h1>Zenith PDF</h1>

        {/* Inline badge */}
        <ConnectionStatusBadge />
      </header>

      {/* Conditional rendering based on status */}
      {isOffline && (
        <div className="offline-notice">
          Working offline. Changes will sync when connection is restored.
        </div>
      )}

      {/* Your app content */}
    </div>
  );
}
```

### 6. Keyboard Shortcuts

**Add keyboard shortcuts to your app**

```tsx
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { useDisclosure } from '@chakra-ui/react';
import { useState } from 'react';

function PDFEditor() {
  const [currentPage, setCurrentPage] = useState(1);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const shortcuts = [
    {
      key: 'ArrowRight',
      description: 'Next page',
      action: () => setCurrentPage(p => p + 1),
    },
    {
      key: 'ArrowLeft',
      description: 'Previous page',
      action: () => setCurrentPage(p => Math.max(1, p - 1)),
    },
    {
      key: '/',
      ctrlKey: true,
      description: 'Show keyboard shortcuts',
      action: onOpen,
    },
    {
      key: 's',
      ctrlKey: true,
      description: 'Save document',
      action: handleSave,
      preventDefault: true, // Prevent browser save dialog
    },
  ];

  // Enable shortcuts
  useKeyboardShortcuts(shortcuts, true);

  return (
    <>
      <PDFViewer page={currentPage} />

      <KeyboardShortcutsModal
        isOpen={isOpen}
        onClose={onClose}
        shortcuts={shortcuts}
      />
    </>
  );
}
```

---

## Store Integration

### 1. Authentication Store

```tsx
import { useAuthStore } from '@/store/auth.store';

function LoginForm() {
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (email: string, password: string) => {
    try {
      await login(email, password);
      // User is now authenticated
      // Redirects automatically
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      handleSubmit(
        formData.get('email') as string,
        formData.get('password') as string
      );
    }}>
      {error && <div className="error">{error}</div>}

      <input name="email" type="email" required />
      <input name="password" type="password" required />

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  );
}

// Access current user
function UserProfile() {
  const { user } = useAuthStore();

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

### 2. Document Store

```tsx
import { useDocumentStore } from '@/store/document.store';
import { useEffect } from 'react';

function DocumentList() {
  const { documents, isLoading, fetchDocuments, uploadDocument } = useDocumentStore();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (file: File) => {
    try {
      await uploadDocument(file);
      // Document uploaded successfully
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />

      <ul>
        {documents.map((doc) => (
          <li key={doc.id}>
            {doc.title} - {doc.pageCount} pages
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. Annotation Store

```tsx
import { useAnnotationStore } from '@/store/annotation.store';

function AnnotationToolbar({ documentId }: Props) {
  const {
    annotations,
    createAnnotation,
    deleteAnnotation,
    selectedAnnotation,
    selectAnnotation
  } = useAnnotationStore();

  const handleCreateHighlight = async (position: Position) => {
    try {
      await createAnnotation({
        documentId,
        annotationType: 'highlight',
        pageNumber: 1,
        position,
        style: {
          color: '#FFEB3B',
          opacity: 0.3,
        },
      });
    } catch (error) {
      console.error('Failed to create annotation:', error);
    }
  };

  const handleDelete = async (annotationId: string) => {
    try {
      await deleteAnnotation(annotationId);
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

  return (
    <div>
      <button onClick={() => handleCreateHighlight({ x: 100, y: 100, width: 200, height: 50 })}>
        Add Highlight
      </button>

      {selectedAnnotation && (
        <button onClick={() => handleDelete(selectedAnnotation.id)}>
          Delete Selected
        </button>
      )}

      <p>Total annotations: {annotations.length}</p>
    </div>
  );
}
```

### 4. Comment Store

```tsx
import { useCommentStore } from '@/store/comment.store';

function CommentThread({ annotationId }: Props) {
  const { comments, addComment, deleteComment, resolveComment } = useCommentStore();

  const threadComments = comments.filter(c => c.annotationId === annotationId);

  const handleAddComment = async (content: string) => {
    try {
      await addComment({
        annotationId,
        content,
      });
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  return (
    <div className="comment-thread">
      {threadComments.map((comment) => (
        <div key={comment.id} className="comment">
          <p>{comment.content}</p>
          <span>{comment.authorId}</span>
          <button onClick={() => deleteComment(comment.id)}>Delete</button>
        </div>
      ))}

      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        handleAddComment(formData.get('content') as string);
        e.currentTarget.reset();
      }}>
        <textarea name="content" required />
        <button type="submit">Post Comment</button>
      </form>
    </div>
  );
}
```

---

## Service Integration

### 1. PDF Exporter Service

```tsx
import { exportPdfWithAnnotations, exportCommentsAsSummary } from '@/services/pdfExporter';
import { useToast } from '@/hooks/useToast';

function ExportButton({ pdfUrl, filename }: Props) {
  const toast = useToast();

  const handleExportWithAnnotations = async () => {
    const loadingId = toast.loading('Exporting PDF...', 'Please wait while we prepare your document');

    try {
      await exportPdfWithAnnotations(pdfUrl, filename, {
        includeComments: true,  // Include comment bubbles
        flattenForms: true,     // Flatten form fields
      });

      toast.close(loadingId);
      toast.success('Export complete', 'Your PDF is downloading');
    } catch (error) {
      toast.close(loadingId);
      toast.error('Export failed', (error as Error).message);
    }
  };

  const handleExportComments = async () => {
    try {
      await exportCommentsAsSummary(pdfUrl, filename);
      toast.success('Comments exported', 'Your comments summary is downloading');
    } catch (error) {
      toast.error('Export failed', (error as Error).message);
    }
  };

  return (
    <div>
      <button onClick={handleExportWithAnnotations}>
        Export with Annotations
      </button>

      <button onClick={handleExportComments}>
        Export Comments Only
      </button>
    </div>
  );
}
```

### 2. API Service with Retry

```tsx
import { apiCallWithRetry } from '@/services/api';
import { documentApi } from '@/services/api';

async function fetchDocumentWithRetry(documentId: string) {
  try {
    // Automatically retries on transient failures
    const document = await apiCallWithRetry(
      () => documentApi.getById(documentId),
      { maxRetries: 3 }
    );

    return document;
  } catch (error) {
    console.error('Failed after retries:', error);
    throw error;
  }
}

// Using the document API directly
async function uploadDocument(file: File) {
  try {
    const document = await documentApi.upload(file, (progress) => {
      console.log(`Upload progress: ${progress}%`);
    });

    return document;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

### 3. WebSocket Service

```tsx
import { websocketService } from '@/services/websocket.service';
import { useEffect } from 'react';

function RealtimeDocument({ documentId }: Props) {
  useEffect(() => {
    // Connect to WebSocket
    websocketService.connect();

    // Join document room
    websocketService.joinDocument(documentId);

    // Listen for messages
    const unsubscribe = websocketService.onMessage((message) => {
      console.log('Received:', message);

      switch (message.type) {
        case 'annotation_created':
          // Handle new annotation
          break;
        case 'comment_added':
          // Handle new comment
          break;
        case 'presence':
          // Handle presence update
          break;
      }
    });

    // Cleanup
    return () => {
      websocketService.leaveDocument(documentId);
      unsubscribe();
    };
  }, [documentId]);

  const sendCursorUpdate = (x: number, y: number, page: number) => {
    websocketService.sendCursorUpdate({ x, y, page });
  };

  return <div>{/* Your component */}</div>;
}
```

---

## Hook Integration

### 1. useToast Hook

```tsx
import { useToast, ToastMessages } from '@/hooks/useToast';

function DocumentActions() {
  const toast = useToast();

  const handleSave = async () => {
    try {
      await saveDocument();

      // Option 1: Custom message
      toast.success('Saved successfully');

      // Option 2: Predefined message
      toast.toast(ToastMessages.saveSuccess());

    } catch (error) {
      toast.toast(ToastMessages.saveFailed());
    }
  };

  const handleLongOperation = async () => {
    // Show loading toast
    const loadingId = toast.loading(
      'Processing...',
      'This may take a few moments'
    );

    try {
      await longRunningOperation();

      // Close loading toast
      toast.close(loadingId);

      // Show success
      toast.success('Operation complete');
    } catch (error) {
      toast.close(loadingId);
      toast.error('Operation failed', (error as Error).message);
    }
  };

  return (
    <div>
      <button onClick={handleSave}>Save</button>
      <button onClick={handleLongOperation}>Process</button>
    </div>
  );
}
```

### 2. useConnectionStatus Hook

```tsx
import { useConnectionStatus } from '@/components/ConnectionStatus';
import { useEffect } from 'react';

function AutoSaveIndicator() {
  const { isOnline, isOffline } = useConnectionStatus();

  useEffect(() => {
    if (isOnline) {
      // Trigger sync when coming back online
      syncPendingChanges();
    }
  }, [isOnline]);

  return (
    <div className="autosave-indicator">
      {isOnline && '✓ All changes saved'}
      {isOffline && '⚠ Working offline - changes will sync when connection restored'}
    </div>
  );
}
```

---

## Real-Time Features

### Complete Real-Time Integration

```tsx
import { usePresenceStore } from '@/store/presence.store';
import { CursorTracker } from '@/components/CursorTracker';
import { PresenceIndicator } from '@/components/PresenceIndicator';
import { websocketService } from '@/services/websocket.service';
import { useEffect, useRef, useState } from 'react';

function CollaborativeDocument({ documentId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { initialize, clearPresence } = usePresenceStore();

  useEffect(() => {
    // 1. Connect to WebSocket
    websocketService.connect();

    // 2. Join document room
    websocketService.joinDocument(documentId);

    // 3. Initialize presence tracking
    initialize();

    // 4. Set up message handlers
    const unsubscribe = websocketService.onMessage((message) => {
      switch (message.type) {
        case 'annotation_created':
          // Annotation stores handle this automatically
          break;
        case 'comment_added':
          // Comment stores handle this automatically
          break;
        case 'document_updated':
          // Refresh document
          break;
      }
    });

    // 5. Cleanup
    return () => {
      websocketService.leaveDocument(documentId);
      clearPresence();
      unsubscribe();
    };
  }, [documentId, initialize, clearPresence]);

  return (
    <div className="collaborative-document">
      <header>
        <h1>Document Title</h1>
        <PresenceIndicator maxAvatars={5} />
      </header>

      <div ref={containerRef} className="document-viewer">
        {/* Your PDF rendering */}
        <PDFContent page={currentPage} />

        {/* Live cursors */}
        <CursorTracker
          currentPage={currentPage}
          containerRef={containerRef}
          scale={1}
        />
      </div>
    </div>
  );
}
```

---

## Custom Annotation Types

### Creating a Custom Annotation Type

```typescript
// 1. Extend the Annotation type
interface CustomAnnotation extends Annotation {
  annotationType: 'custom_shape';
  customData: {
    shapeType: 'circle' | 'triangle' | 'star';
    rotation: number;
  };
}

// 2. Create renderer component
import { useAnnotationStore } from '@/store/annotation.store';

function CustomAnnotationRenderer({ annotation }: { annotation: CustomAnnotation }) {
  const { updateAnnotation, deleteAnnotation } = useAnnotationStore();

  const handleRotate = () => {
    updateAnnotation(annotation.id, {
      customData: {
        ...annotation.customData,
        rotation: (annotation.customData.rotation + 45) % 360,
      },
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: annotation.position.x,
        top: annotation.position.y,
        width: annotation.position.width,
        height: annotation.position.height,
        transform: `rotate(${annotation.customData.rotation}deg)`,
        cursor: 'pointer',
      }}
      onClick={handleRotate}
    >
      {/* Render your custom shape */}
      {annotation.customData.shapeType === 'circle' && <Circle />}
      {annotation.customData.shapeType === 'triangle' && <Triangle />}
      {annotation.customData.shapeType === 'star' && <Star />}
    </div>
  );
}

// 3. Create tool for adding annotations
function CustomShapeTool({ documentId, pageNumber }: Props) {
  const { createAnnotation } = useAnnotationStore();

  const handleAddShape = async (shapeType: 'circle' | 'triangle' | 'star') => {
    await createAnnotation({
      documentId,
      annotationType: 'custom_shape',
      pageNumber,
      position: { x: 100, y: 100, width: 50, height: 50 },
      customData: {
        shapeType,
        rotation: 0,
      },
    } as CustomAnnotation);
  };

  return (
    <div className="custom-shape-tool">
      <button onClick={() => handleAddShape('circle')}>Circle</button>
      <button onClick={() => handleAddShape('triangle')}>Triangle</button>
      <button onClick={() => handleAddShape('star')}>Star</button>
    </div>
  );
}

// 4. Integrate into annotation layer
function AnnotationLayer({ annotations }: { annotations: Annotation[] }) {
  return (
    <div className="annotation-layer">
      {annotations.map((annotation) => {
        switch (annotation.annotationType) {
          case 'highlight':
            return <HighlightRenderer key={annotation.id} annotation={annotation} />;
          case 'custom_shape':
            return <CustomAnnotationRenderer key={annotation.id} annotation={annotation as CustomAnnotation} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
```

### Exporting Custom Annotations

```typescript
import { PDFDocument, PDFPage } from 'pdf-lib';

async function drawCustomShape(
  page: PDFPage,
  annotation: CustomAnnotation,
  pdfDoc: PDFDocument
) {
  const { x, y, width, height } = annotation.position;
  const { shapeType, rotation } = annotation.customData;

  // Example: Draw a circle
  if (shapeType === 'circle') {
    page.drawEllipse({
      x: x + width / 2,
      y: page.getHeight() - y - height / 2,
      xScale: width / 2,
      yScale: height / 2,
      borderColor: rgb(0, 0, 1),
      borderWidth: 2,
      rotate: degrees(rotation),
    });
  }

  // Add similar logic for triangle, star, etc.
}

// Integrate into pdfExporter.ts
// In the annotation loop, add:
case 'custom_shape':
  await drawCustomShape(page, annotation as CustomAnnotation, pdfDoc);
  break;
```

---

## Extending Functionality

### Adding a Custom Sidebar Panel

```tsx
import { useState } from 'react';
import { Tab, Tabs, TabList, TabPanel } from '@chakra-ui/react';

function DocumentSidebar() {
  return (
    <aside className="document-sidebar">
      <Tabs>
        <TabList>
          <Tab>Thumbnails</Tab>
          <Tab>Outline</Tab>
          <Tab>Annotations</Tab>
          <Tab>Custom Panel</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>{/* Thumbnails */}</TabPanel>
          <TabPanel>{/* Outline */}</TabPanel>
          <TabPanel>{/* Annotations */}</TabPanel>
          <TabPanel>
            <CustomPanel />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </aside>
  );
}

function CustomPanel() {
  // Your custom functionality
  return (
    <div className="custom-panel">
      <h3>Custom Features</h3>
      {/* Add your custom UI */}
    </div>
  );
}
```

### Adding Custom Toolbar Actions

```tsx
import { IconButton, Tooltip } from '@chakra-ui/react';
import { FiStar } from 'react-icons/fi';

function DocumentToolbar() {
  const handleCustomAction = () => {
    // Your custom action
    console.log('Custom action triggered');
  };

  return (
    <div className="document-toolbar">
      {/* Existing tools */}
      <button>Highlight</button>
      <button>Underline</button>

      {/* Your custom tool */}
      <Tooltip label="Custom Action">
        <IconButton
          icon={<FiStar />}
          aria-label="Custom action"
          onClick={handleCustomAction}
        />
      </Tooltip>
    </div>
  );
}
```

---

## API Integration

### Backend API Endpoints

```typescript
// Example: Creating a custom API endpoint

// backend/src/routes/custom.routes.ts
import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';

export async function customRoutes(fastify: FastifyInstance) {
  // Protected endpoint
  fastify.get('/api/custom/data',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.userId;

      // Your custom logic
      const data = await getCustomData(userId);

      return reply.send({ data });
    }
  );

  // Public endpoint
  fastify.post('/api/custom/public', async (request, reply) => {
    const { payload } = request.body as { payload: unknown };

    // Process payload
    const result = await processCustomPayload(payload);

    return reply.send({ result });
  });
}

// Register in backend/src/index.ts
await fastify.register(customRoutes);
```

### Frontend API Client

```typescript
// frontend/src/services/custom.api.ts
import { api } from './api';

export const customApi = {
  async getData(): Promise<CustomData> {
    const response = await api.get<{ data: CustomData }>('/custom/data');
    return response.data.data;
  },

  async sendPublicData(payload: unknown): Promise<CustomResult> {
    const response = await api.post<{ result: CustomResult }>(
      '/custom/public',
      { payload }
    );
    return response.data.result;
  },
};

// Usage in component
import { customApi } from '@/services/custom.api';
import { useEffect, useState } from 'react';

function CustomComponent() {
  const [data, setData] = useState<CustomData | null>(null);

  useEffect(() => {
    customApi.getData()
      .then(setData)
      .catch(console.error);
  }, []);

  return <div>{data && <pre>{JSON.stringify(data, null, 2)}</pre>}</div>;
}
```

---

## Best Practices

### 1. Error Handling

```tsx
import { useToast } from '@/hooks/useToast';
import { getErrorMessage } from '@/utils/apiRetry';

function DocumentUpload() {
  const toast = useToast();

  const handleUpload = async (file: File) => {
    try {
      await uploadDocument(file);
      toast.success('Upload successful');
    } catch (error) {
      // Use error message utility
      const message = getErrorMessage(error);
      toast.error('Upload failed', message);

      // Log for debugging
      if (import.meta.env.DEV) {
        console.error('Upload error:', error);
      }
    }
  };

  return <input type="file" onChange={(e) => handleUpload(e.target.files![0])} />;
}
```

### 2. Performance Optimization

```tsx
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive components
const AnnotationLayer = memo(({ annotations }: Props) => {
  return (
    <>
      {annotations.map((a) => (
        <Annotation key={a.id} data={a} />
      ))}
    </>
  );
});

// Memoize expensive computations
function DocumentStats({ annotations }: Props) {
  const stats = useMemo(() => {
    return {
      total: annotations.length,
      highlights: annotations.filter(a => a.annotationType === 'highlight').length,
      comments: annotations.filter(a => a.annotationType === 'comment').length,
    };
  }, [annotations]);

  return <div>{JSON.stringify(stats)}</div>;
}

// Memoize callbacks
function AnnotationToolbar() {
  const { createAnnotation } = useAnnotationStore();

  const handleCreate = useCallback(async (type: string) => {
    await createAnnotation({ annotationType: type, /* ... */ });
  }, [createAnnotation]);

  return <button onClick={() => handleCreate('highlight')}>Highlight</button>;
}
```

### 3. Type Safety

```typescript
// Always use TypeScript types
import type { Annotation, Comment, Document } from '@/types';

interface DocumentViewerProps {
  document: Document;
  annotations: Annotation[];
  onAnnotationCreate: (annotation: Omit<Annotation, 'id'>) => Promise<void>;
}

function DocumentViewer({ document, annotations, onAnnotationCreate }: DocumentViewerProps) {
  // Type-safe implementation
  const handleCreate = async (data: Omit<Annotation, 'id'>) => {
    await onAnnotationCreate(data);
  };

  return <div>{/* ... */}</div>;
}
```

### 4. Accessibility

```tsx
import {
  Button,
  IconButton,
  Tooltip,
  VisuallyHidden
} from '@chakra-ui/react';

function AccessibleToolbar() {
  return (
    <div role="toolbar" aria-label="Annotation tools">
      {/* Always include aria-label for icon buttons */}
      <Tooltip label="Highlight text">
        <IconButton
          icon={<FiHighlight />}
          aria-label="Highlight text"
          onClick={handleHighlight}
        />
      </Tooltip>

      {/* Use VisuallyHidden for screen reader text */}
      <Button>
        <FiSave />
        <VisuallyHidden>Save document</VisuallyHidden>
      </Button>

      {/* Keyboard navigation */}
      <Button
        onClick={handleNext}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleNext();
          }
        }}
      >
        Next Page
      </Button>
    </div>
  );
}
```

### 5. Testing Integration

```typescript
// Write tests for your integrations
import { render, screen, waitFor } from '@testing-library/react';
import { renderWithChakra } from '@/test-utils';
import { CustomComponent } from './CustomComponent';

describe('CustomComponent', () => {
  it('integrates with presence store', async () => {
    renderWithChakra(<CustomComponent />);

    await waitFor(() => {
      expect(screen.getByText(/viewers/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API failure
    vi.spyOn(customApi, 'getData').mockRejectedValue(new Error('API error'));

    renderWithChakra(<CustomComponent />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

---

## Code Examples Repository

All integration examples are available in the repository:

```
examples/
├── basic-integration/
│   ├── simple-viewer.tsx
│   ├── annotation-editor.tsx
│   └── README.md
├── advanced-integration/
│   ├── custom-annotation-type.tsx
│   ├── custom-toolbar.tsx
│   ├── custom-sidebar.tsx
│   └── README.md
├── real-time-features/
│   ├── collaborative-editing.tsx
│   ├── presence-tracking.tsx
│   └── README.md
└── api-integration/
    ├── custom-endpoints.ts
    ├── custom-api-client.ts
    └── README.md
```

---

## Support

**Questions or Issues?**
- GitHub Issues: https://github.com/yourorg/zenith-pdf/issues
- Discord: https://discord.gg/zenithpdf
- Email: developers@zenithpdf.com

**Contributing:**
See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

## Conclusion

This guide covered:
- ✅ Component integration (6 major components)
- ✅ Store integration (4 Zustand stores)
- ✅ Service integration (PDF export, API, WebSocket)
- ✅ Hook integration (useToast, useKeyboardShortcuts)
- ✅ Real-time features (presence, cursors, sync)
- ✅ Custom annotation types
- ✅ Extending functionality
- ✅ API integration (backend + frontend)
- ✅ Best practices (error handling, performance, types, a11y, testing)

You now have everything you need to integrate and extend Zenith PDF!

---

*Document Version: 1.0*
*Last Updated: 2025-10-19*
*Author: Claude (AI Assistant)*
