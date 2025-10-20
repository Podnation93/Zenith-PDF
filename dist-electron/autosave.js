"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoSaveManager = void 0;
exports.registerAutoSaveHandlers = registerAutoSaveHandlers;
const electron_1 = require("electron");
class AutoSaveManager {
    constructor(db, config = {}) {
        this.pendingChanges = new Map();
        this.saveTimer = null;
        this.lastSaveTime = Date.now();
        this.db = db;
        this.config = {
            intervalMs: config.intervalMs || 5000, // Default: 5 seconds
            enabled: config.enabled !== undefined ? config.enabled : true,
        };
    }
    /**
     * Start the auto-save timer
     */
    start() {
        if (!this.config.enabled) {
            return;
        }
        this.saveTimer = setInterval(() => {
            this.processPendingChanges();
        }, this.config.intervalMs);
    }
    /**
     * Stop the auto-save timer
     */
    stop() {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
            this.saveTimer = null;
        }
    }
    /**
     * Queue a change for auto-save
     */
    queueChange(id, change) {
        this.pendingChanges.set(id, change);
    }
    /**
     * Process all pending changes
     */
    processPendingChanges() {
        if (this.pendingChanges.size === 0) {
            return;
        }
        const changes = Array.from(this.pendingChanges.entries());
        const transaction = this.db.transaction(() => {
            for (const [id, change] of changes) {
                try {
                    this.applyChange(id, change);
                    this.pendingChanges.delete(id);
                }
                catch (error) {
                    console.error(`Failed to auto-save change ${id}:`, error);
                    // Keep the change in the queue to retry
                }
            }
        });
        try {
            transaction();
            this.lastSaveTime = Date.now();
        }
        catch (error) {
            console.error('Auto-save transaction failed:', error);
        }
    }
    /**
     * Apply a single change to the database
     */
    applyChange(id, change) {
        switch (change.type) {
            case 'annotation':
                this.applyAnnotationChange(id, change);
                break;
            case 'comment':
                this.applyCommentChange(id, change);
                break;
            case 'document':
                this.applyDocumentChange(id, change);
                break;
        }
    }
    applyAnnotationChange(id, change) {
        const { operation, data } = change;
        switch (operation) {
            case 'create':
                this.db.prepare(`
          INSERT OR IGNORE INTO annotations (id, document_id, user_id, annotation_type, page_number, position, style, content, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, data.documentId, data.userId, data.annotationType, data.pageNumber, JSON.stringify(data.position), data.style ? JSON.stringify(data.style) : null, data.content || null, data.createdAt || new Date().toISOString(), new Date().toISOString());
                break;
            case 'update':
                const fields = [];
                const values = [];
                if (data.position) {
                    fields.push('position = ?');
                    values.push(JSON.stringify(data.position));
                }
                if (data.style) {
                    fields.push('style = ?');
                    values.push(JSON.stringify(data.style));
                }
                if (data.content !== undefined) {
                    fields.push('content = ?');
                    values.push(data.content);
                }
                fields.push('updated_at = ?');
                values.push(new Date().toISOString());
                values.push(id);
                if (fields.length > 1) {
                    this.db.prepare(`
            UPDATE annotations SET ${fields.join(', ')} WHERE id = ?
          `).run(...values);
                }
                break;
            case 'delete':
                this.db.prepare('DELETE FROM annotations WHERE id = ?').run(id);
                break;
        }
    }
    applyCommentChange(id, change) {
        const { operation, data } = change;
        switch (operation) {
            case 'create':
                this.db.prepare(`
          INSERT OR IGNORE INTO comments (id, annotation_id, user_id, content, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, data.annotationId, data.userId, data.content, data.createdAt || new Date().toISOString(), new Date().toISOString());
                break;
            case 'update':
                this.db.prepare(`
          UPDATE comments SET content = ?, updated_at = ? WHERE id = ?
        `).run(data.content, new Date().toISOString(), id);
                break;
            case 'delete':
                this.db.prepare('DELETE FROM comments WHERE id = ?').run(id);
                break;
        }
    }
    applyDocumentChange(id, change) {
        const { operation, data } = change;
        if (operation === 'update') {
            this.db.prepare(`
        UPDATE documents SET updated_at = ? WHERE id = ?
      `).run(new Date().toISOString(), id);
        }
    }
    /**
     * Force immediate save of all pending changes
     */
    forceSave() {
        this.processPendingChanges();
    }
    /**
     * Get the number of pending changes
     */
    getPendingCount() {
        return this.pendingChanges.size;
    }
    /**
     * Get the last save time
     */
    getLastSaveTime() {
        return this.lastSaveTime;
    }
    /**
     * Check if auto-save is enabled
     */
    isEnabled() {
        return this.config.enabled;
    }
    /**
     * Enable or disable auto-save
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        if (enabled && !this.saveTimer) {
            this.start();
        }
        else if (!enabled && this.saveTimer) {
            this.stop();
        }
    }
    /**
     * Update auto-save interval
     */
    setInterval(intervalMs) {
        this.config.intervalMs = intervalMs;
        if (this.saveTimer) {
            this.stop();
            this.start();
        }
    }
}
exports.AutoSaveManager = AutoSaveManager;
/**
 * Register auto-save IPC handlers
 */
function registerAutoSaveHandlers(autoSaveManager) {
    electron_1.ipcMain.handle('autosave:force-save', async () => {
        autoSaveManager.forceSave();
        return { success: true };
    });
    electron_1.ipcMain.handle('autosave:get-status', async () => {
        return {
            success: true,
            status: {
                enabled: autoSaveManager.isEnabled(),
                pendingChanges: autoSaveManager.getPendingCount(),
                lastSaveTime: autoSaveManager.getLastSaveTime(),
            },
        };
    });
    electron_1.ipcMain.handle('autosave:set-enabled', async (event, { enabled }) => {
        autoSaveManager.setEnabled(enabled);
        return { success: true };
    });
    electron_1.ipcMain.handle('autosave:set-interval', async (event, { intervalMs }) => {
        if (intervalMs < 1000 || intervalMs > 300000) {
            throw new Error('Interval must be between 1 second and 5 minutes');
        }
        autoSaveManager.setInterval(intervalMs);
        return { success: true };
    });
}
