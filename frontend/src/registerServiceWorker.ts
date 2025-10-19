import { processSyncQueue } from './sync';

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);

        // Listen for messages from the service worker.
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data && event.data.type === 'SYNC_REQUEST') {
            console.log('Client received SYNC_REQUEST from service worker.');
            processSyncQueue();
          }
        });

      }).catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
    });
  }
}

export function requestSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(reg => {
      return reg.sync.register('sync-annotations');
    }).then(() => {
      console.log('Background sync registered for annotations.');
    }).catch(err => {
      console.error('Background sync registration failed:', err);
    });
  } else {
    // Fallback for browsers that don't support Background Sync
    // Try to sync immediately if online
    if (navigator.onLine) {
      processSyncQueue();
    }
  }
}
