import { create } from 'zustand';
import { websocketService } from '../services/websocket';
import type { WebSocketMessage } from '../types';

export interface PresenceUser {
  id: string;
  name: string;
  avatarUrl?: string;
  cursorPosition?: {
    page: number;
    x: number;
    y: number;
  } | null;
  lastActive?: number;
}

interface PresenceStoreState {
  presentUsers: Record<string, PresenceUser>;
  isInitialized: boolean;
}

interface PresenceStoreActions {
  initialize: () => void;
  clearPresence: () => void;
  updateUserCursor: (userId: string, cursorPosition: PresenceUser['cursorPosition']) => void;
  removeInactiveUsers: () => void;
}

type PresenceStore = PresenceStoreState & PresenceStoreActions;

const INACTIVE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const usePresenceStore = create<PresenceStore>((set, get) => ({
  presentUsers: {},
  isInitialized: false,

  initialize: () => {
    if (get().isInitialized) return;

    websocketService.onMessage((message: WebSocketMessage) => {
      if (message.type !== 'presence') return;

      const { action, user, cursorPosition } = message.payload;

      set((state) => {
        const currentUsers = { ...state.presentUsers };

        switch (action) {
          case 'join':
            currentUsers[user.id] = {
              ...user,
              cursorPosition: cursorPosition || null,
              lastActive: Date.now(),
            };
            break;
          case 'update':
            if (currentUsers[user.id]) {
              currentUsers[user.id] = {
                ...currentUsers[user.id],
                ...user,
                cursorPosition: cursorPosition !== undefined ? cursorPosition : currentUsers[user.id].cursorPosition,
                lastActive: Date.now(),
              };
            } else {
              currentUsers[user.id] = {
                ...user,
                cursorPosition: cursorPosition || null,
                lastActive: Date.now(),
              };
            }
            break;
          case 'leave':
            delete currentUsers[user.id];
            break;
        }
        return { presentUsers: currentUsers };
      });
    });

    // Listen for cursor updates
    websocketService.onMessage((message: WebSocketMessage) => {
      if (message.type !== 'cursor') return;

      const { userId, payload } = message;
      const { cursorPosition } = payload;

      set((state) => {
        const currentUsers = { ...state.presentUsers };
        if (currentUsers[userId]) {
          currentUsers[userId] = {
            ...currentUsers[userId],
            cursorPosition,
            lastActive: Date.now(),
          };
        }
        return { presentUsers: currentUsers };
      });
    });

    // Periodically clean up inactive users
    setInterval(() => {
      get().removeInactiveUsers();
    }, 60000); // Check every minute

    set({ isInitialized: true });
  },

  clearPresence: () => set({ presentUsers: {}, isInitialized: false }),

  updateUserCursor: (userId: string, cursorPosition: PresenceUser['cursorPosition']) => {
    set((state) => {
      const currentUsers = { ...state.presentUsers };
      if (currentUsers[userId]) {
        currentUsers[userId] = {
          ...currentUsers[userId],
          cursorPosition,
          lastActive: Date.now(),
        };
      }
      return { presentUsers: currentUsers };
    });
  },

  removeInactiveUsers: () => {
    const now = Date.now();
    set((state) => {
      const currentUsers = { ...state.presentUsers };
      Object.keys(currentUsers).forEach((userId) => {
        const user = currentUsers[userId];
        if (user.lastActive && now - user.lastActive > INACTIVE_TIMEOUT) {
          delete currentUsers[userId];
        }
      });
      return { presentUsers: currentUsers };
    });
  },
}));
