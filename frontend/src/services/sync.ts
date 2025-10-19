import { getSyncQueue, clearSyncQueue } from './db';
import { api } from './api';

// This is a simple processor. A more robust solution would handle different types of sync tasks.
async function processSyncTask(task: any) {
  if (task.type === 'createAnnotation') {
    const { documentId, annotationData } = task.payload;
    await api.post(`/api/documents/${documentId}/annotations`, annotationData);
  } else {
    console.warn('Unknown sync task type:', task.type);
  }
}

export async function processSyncQueue() {
  console.log('Processing sync queue...');
  try {
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      console.log('Sync queue is empty.');
      return;
    }

    console.log(`Found ${queue.length} items to sync.`);
    
    for (const task of queue) {
      await processSyncTask(task);
    }

    // If all tasks succeeded, clear the queue
    await clearSyncQueue();
    console.log('Sync queue processed and cleared successfully.');

  } catch (error) {
    console.error('Error processing sync queue:', error);
    // Decide on a retry strategy. For now, we leave items in the queue.
  }
}
