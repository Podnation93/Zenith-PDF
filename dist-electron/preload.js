"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Authentication
    auth: {
        register: (credentials) => electron_1.ipcRenderer.invoke('auth:register', credentials),
        login: (credentials) => electron_1.ipcRenderer.invoke('auth:login', credentials),
        verify: (token) => electron_1.ipcRenderer.invoke('auth:verify', { token }),
        validatePassword: (password, userInputs) => electron_1.ipcRenderer.invoke('auth:validate-password', { password, userInputs }),
    },
    // Documents
    documents: {
        list: (userId) => electron_1.ipcRenderer.invoke('documents:list', { userId }),
        upload: (userId, filePath, fileName) => electron_1.ipcRenderer.invoke('documents:upload', { userId, filePath, fileName }),
        get: (documentId) => electron_1.ipcRenderer.invoke('documents:get', { documentId }),
        delete: (documentId, userId) => electron_1.ipcRenderer.invoke('documents:delete', { documentId, userId }),
        selectFile: () => electron_1.ipcRenderer.invoke('documents:select-file'),
    },
    // Annotations
    annotations: {
        list: (documentId) => electron_1.ipcRenderer.invoke('annotations:list', { documentId }),
        create: (documentId, userId, annotation) => electron_1.ipcRenderer.invoke('annotations:create', { documentId, userId, annotation }),
        update: (annotationId, updates) => electron_1.ipcRenderer.invoke('annotations:update', { annotationId, updates }),
        delete: (annotationId, userId) => electron_1.ipcRenderer.invoke('annotations:delete', { annotationId, userId }),
    },
    // Comments
    comments: {
        list: (annotationId) => electron_1.ipcRenderer.invoke('comments:list', { annotationId }),
        create: (annotationId, userId, content) => electron_1.ipcRenderer.invoke('comments:create', { annotationId, userId, content }),
        resolve: (commentId) => electron_1.ipcRenderer.invoke('comments:resolve', { commentId }),
    },
    // Activities
    activities: {
        list: (documentId) => electron_1.ipcRenderer.invoke('activities:list', { documentId }),
    },
    // App
    app: {
        getVersion: () => electron_1.ipcRenderer.invoke('app:get-version'),
        getPath: (name) => electron_1.ipcRenderer.invoke('app:get-path', name),
    },
    // Auto-save
    autosave: {
        forceSave: () => electron_1.ipcRenderer.invoke('autosave:force-save'),
        getStatus: () => electron_1.ipcRenderer.invoke('autosave:get-status'),
        setEnabled: (enabled) => electron_1.ipcRenderer.invoke('autosave:set-enabled', { enabled }),
        setInterval: (intervalMs) => electron_1.ipcRenderer.invoke('autosave:set-interval', { intervalMs }),
    },
    // Export
    export: {
        withAnnotations: (documentId, outputPath) => electron_1.ipcRenderer.invoke('export:with-annotations', { documentId, outputPath }),
        annotationsSummary: (documentId, outputPath) => electron_1.ipcRenderer.invoke('export:annotations-summary', { documentId, outputPath }),
        selectOutputPath: () => electron_1.ipcRenderer.invoke('export:select-output-path'),
    },
});
