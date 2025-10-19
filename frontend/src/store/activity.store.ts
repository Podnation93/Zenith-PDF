import { create } from 'zustand';
import { websocketService } from '../services/websocket';
import type { WebSocketMessage } from '../types';

export interface Activity {
  id: string;
  type: 'annotation' | 'comment';
  action: 'create' | 'update' | 'delete';
  userName: string; // We may need to resolve user ID to name
  details: string;
  timestamp: number;
}

interface ActivityStoreState {
  activities: Activity[];
}

interface ActivityStoreActions {
  initialize: () => void;
  addActivity: (activity: Omit<Activity, 'id'>) => void;
  clearActivities: () => void;
}

type ActivityStore = ActivityStoreState & ActivityStoreActions;

let activityCounter = 0;

export const useActivityStore = create<ActivityStore>((set, get) => ({
  activities: [],

  initialize: () => {
    websocketService.onMessage((message: WebSocketMessage) => {
      const { type, payload, userId } = message;

      if (type !== 'annotation' && type !== 'comment') return;

      // For now, we'll use a placeholder name. A real implementation
      // would look up the user's name from a presence or user store.
      const userName = `User ${userId.substring(0, 4)}`;

      let details = '';
      if (type === 'annotation') {
        details = `an annotation of type ${payload.annotation?.type || 'unknown'}`;
      } else if (type === 'comment') {
        details = 'a comment';
      }

      get().addActivity({
        type: type,
        action: payload.action,
        userName: userName,
        details: `${payload.action}d ${details}`,
        timestamp: message.timestamp,
      });
    });
  },

  addActivity: (activity) => {
    set(state => ({
      activities: [{ ...activity, id: `act-${activityCounter++}` }, ...state.activities].slice(0, 100) // Keep last 100 activities
    }));
  },

  clearActivities: () => set({ activities: [] }),
}));
