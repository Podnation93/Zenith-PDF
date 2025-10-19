import type { WebSocketMessage } from '../types';

class WebSocketService {
  private ws: WebSocket | null = null;
  private documentId: string | null = null;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: number | null = null;
  private messageHandlers: Set<(message: WebSocketMessage) => void> = new Set();

  connect(documentId: string, token: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.documentId = documentId;
      this.userId = userId;

      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${
        window.location.host
      }/ws/${documentId}?token=${token}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.notifyHandlers(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.stopHeartbeat();
        this.attemptReconnect();
      };
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.documentId = null;
    this.userId = null;
    this.reconnectAttempts = 0;
  }

  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  onMessage(handler: (message: WebSocketMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  private notifyHandlers(message: WebSocketMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      this.send({
        type: 'heartbeat',
        documentId: this.documentId!,
        userId: this.userId!,
        timestamp: Date.now(),
      });
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms...`);

    setTimeout(() => {
      if (this.documentId && this.userId) {
        const token = localStorage.getItem('accessToken');
        if (token) {
          this.connect(this.documentId, token, this.userId).catch((error) => {
            console.error('Reconnect failed:', error);
          });
        }
      }
    }, delay);
  }

  // Helper methods for common operations
  sendPresenceUpdate(cursorPosition: { page: number; x: number; y: number } | null): void {
    this.send({
      type: 'presence',
      documentId: this.documentId!,
      userId: this.userId!,
      payload: {
        userId: this.userId!,
        cursorPosition,
        action: 'update',
      },
      timestamp: Date.now(),
    });
  }

  sendCursorUpdate(cursorPosition: { page: number; x: number; y: number }): void {
    this.send({
      type: 'cursor',
      documentId: this.documentId!,
      userId: this.userId!,
      payload: { cursorPosition },
      timestamp: Date.now(),
    });
  }

  sendAnnotationUpdate(annotationId: string, action: 'create' | 'update' | 'delete', data?: any): void {
    this.send({
      type: 'annotation',
      documentId: this.documentId!,
      userId: this.userId!,
      payload: {
        annotationId,
        action,
        annotation: data,
      },
      timestamp: Date.now(),
    });
  }

  sendCommentUpdate(commentId: string, action: 'create' | 'update' | 'delete', data?: any): void {
    this.send({
      type: 'comment',
      documentId: this.documentId!,
      userId: this.userId!,
      payload: {
        commentId,
        action,
        comment: data,
      },
      timestamp: Date.now(),
    });
  }
}

export const websocketService = new WebSocketService();
