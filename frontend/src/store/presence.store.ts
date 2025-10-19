import { create } from 'zustand';
import { websocketService } from '../services/websocket';
import type { WebSocketMessage } from '../types';

export interface PresenceUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface PresenceStoreState {
  presentUsers: Record<string, PresenceUser>;
}

interface PresenceStoreActions {
  initialize: () => void;
  clearPresence: () => void;
}

type PresenceStore = PresenceStoreState & PresenceStoreActions;

export const usePresenceStore = create<PresenceStore>((set, get) => ({
  presentUsers: {},

  initialize: () => {
    websocketService.onMessage((message: WebSocketMessage) => {
      if (message.type !== 'presence') return;

      const { action, user } = message.payload;
      
      set(state => {
        const currentUsers = { ...state.presentUsers };

        switch (action) {
          case 'join':
          case 'update':
            currentUsers[user.id] = user;
            break;
          case 'leave':
            delete currentUsers[user.id];
            break;
        }
        return { presentUsers: currentUsers };
      });
    });

    // Announce our presence when connection is established
    // This should be handled right after connect in DocumentViewer
  },

  clearPresence: () => set({ presentUsers: {} }),
}));
