"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// __dirname is automatically available in CommonJS
// Database setup - will be initialized when app is ready
let userDataPath;
let dbPath;
let documentsPath;
let db;
// JWT secret (in production, store securely or generate per-install)
const JWT_SECRET = process.env.JWT_SECRET || 'zenith-pdf-desktop-secret-key';
function initializePaths() {
    userDataPath = electron_1.app.getPath('userData');
    dbPath = node_path_1.default.join(userDataPath, 'zenith.db');
    documentsPath = node_path_1.default.join(userDataPath, 'documents');
    // Ensure directories exist
    if (!(0, fs_1.existsSync)(documentsPath)) {
        (0, fs_1.mkdirSync)(documentsPath, { recursive: true });
    }
    db = new better_sqlite3_1.default(dbPath);
}
// Initialize database schema
function initializeDatabase() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      page_count INTEGER,
      owner_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      annotation_type TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      position TEXT NOT NULL,
      style TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      annotation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      resolved BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      share_token TEXT UNIQUE NOT NULL,
      access_level TEXT NOT NULL,
      password_hash TEXT,
      expires_at DATETIME,
      max_uses INTEGER,
      current_uses INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_annotations_document ON annotations(document_id);
    CREATE INDEX IF NOT EXISTS idx_comments_annotation ON comments(annotation_id);
    CREATE INDEX IF NOT EXISTS idx_activities_document ON activities(document_id);
  `);
}
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            preload: node_path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: node_path_1.default.join(__dirname, '../resources/icon.png'),
        title: 'Zenith PDF - Desktop',
    });
    // In development, load from Vite dev server
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        // In production, load built files
        mainWindow.loadFile(node_path_1.default.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// App lifecycle
electron_1.app.whenReady().then(() => {
    initializePaths();
    initializeDatabase();
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// ============================================================
// IPC Handlers - Authentication
// ============================================================
electron_1.ipcMain.handle('auth:register', async (event, { email, password, firstName, lastName }) => {
    try {
        const id = generateId();
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, first_name, last_name)
      VALUES (?, ?, ?, ?, ?)
    `);
        stmt.run(id, email, passwordHash, firstName || null, lastName || null);
        const token = jsonwebtoken_1.default.sign({ userId: id, email }, JWT_SECRET, { expiresIn: '30d' });
        return {
            success: true,
            user: { id, email, firstName, lastName },
            token,
        };
    }
    catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            throw new Error('Email already exists');
        }
        throw error;
    }
});
electron_1.ipcMain.handle('auth:login', async (event, { email, password }) => {
    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            throw new Error('Invalid email or password');
        }
        const isValid = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isValid) {
            throw new Error('Invalid email or password');
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                avatarUrl: user.avatar_url,
            },
            token,
        };
    }
    catch (error) {
        throw error;
    }
});
electron_1.ipcMain.handle('auth:verify', async (event, { token }) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId);
        if (!user) {
            throw new Error('User not found');
        }
        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                avatarUrl: user.avatar_url,
            },
        };
    }
    catch (error) {
        throw new Error('Invalid token');
    }
});
// ============================================================
// IPC Handlers - Documents
// ============================================================
electron_1.ipcMain.handle('documents:list', async (event, { userId }) => {
    try {
        const documents = db.prepare(`
      SELECT id, title, file_size, page_count, created_at, updated_at
      FROM documents
      WHERE owner_id = ?
      ORDER BY updated_at DESC
    `).all(userId);
        return { success: true, documents };
    }
    catch (error) {
        throw error;
    }
});
electron_1.ipcMain.handle('documents:upload', async (event, { userId, filePath, fileName }) => {
    try {
        const id = generateId();
        const stats = await promises_1.default.stat(filePath);
        const fileSize = stats.size;
        // Copy file to documents directory
        const newPath = node_path_1.default.join(documentsPath, `${id}.pdf`);
        await promises_1.default.copyFile(filePath, newPath);
        // Get page count (would need pdf-parse or similar)
        const pageCount = await getPdfPageCount(newPath);
        const stmt = db.prepare(`
      INSERT INTO documents (id, title, file_path, file_size, page_count, owner_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, fileName, newPath, fileSize, pageCount, userId);
        // Log activity
        logActivity(id, userId, 'document_uploaded', { fileName });
        return {
            success: true,
            document: {
                id,
                title: fileName,
                fileSize,
                pageCount,
                createdAt: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        throw error;
    }
});
electron_1.ipcMain.handle('documents:get', async (event, { documentId }) => {
    try {
        const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId);
        if (!document) {
            throw new Error('Document not found');
        }
        // Read file as base64 for sending to renderer
        const fileBuffer = await promises_1.default.readFile(document.file_path);
        const fileBase64 = fileBuffer.toString('base64');
        return {
            success: true,
            document: {
                id: document.id,
                title: document.title,
                fileSize: document.file_size,
                pageCount: document.page_count,
                createdAt: document.created_at,
                updatedAt: document.updated_at,
                fileData: fileBase64,
            },
        };
    }
    catch (error) {
        throw error;
    }
});
electron_1.ipcMain.handle('documents:delete', async (event, { documentId, userId }) => {
    try {
        const document = db.prepare('SELECT * FROM documents WHERE id = ? AND owner_id = ?')
            .get(documentId, userId);
        if (!document) {
            throw new Error('Document not found or access denied');
        }
        // Delete file
        await promises_1.default.unlink(document.file_path);
        // Delete from database (cascade deletes annotations, comments, etc.)
        db.prepare('DELETE FROM documents WHERE id = ?').run(documentId);
        return { success: true };
    }
    catch (error) {
        throw error;
    }
});
electron_1.ipcMain.handle('documents:select-file', async () => {
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (result.canceled) {
        return { success: false };
    }
    return {
        success: true,
        filePath: result.filePaths[0],
        fileName: node_path_1.default.basename(result.filePaths[0]),
    };
});
// ============================================================
// IPC Handlers - Annotations
// ============================================================
electron_1.ipcMain.handle('annotations:list', async (event, { documentId }) => {
    try {
        const annotations = db.prepare(`
      SELECT * FROM annotations WHERE document_id = ?
    `).all(documentId);
        return {
            success: true,
            annotations: annotations.map((a) => ({
                ...a,
                position: JSON.parse(a.position),
                style: a.style ? JSON.parse(a.style) : null,
            })),
        };
    }
    catch (error) {
        throw error;
    }
});
electron_1.ipcMain.handle('annotations:create', async (event, { documentId, userId, annotation }) => {
    try {
        const id = generateId();
        const stmt = db.prepare(`
      INSERT INTO annotations (id, document_id, user_id, annotation_type, page_number, position, style, content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, documentId, userId, annotation.annotationType, annotation.pageNumber, JSON.stringify(annotation.position), annotation.style ? JSON.stringify(annotation.style) : null, annotation.content || null);
        logActivity(documentId, userId, 'annotation_created', {
            annotationType: annotation.annotationType,
        });
        return {
            success: true,
            annotation: {
                id,
                ...annotation,
                createdAt: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        throw error;
    }
});
electron_1.ipcMain.handle('annotations:update', async (event, { annotationId, updates }) => {
    try {
        const fields = [];
        const values = [];
        if (updates.position) {
            fields.push('position = ?');
            values.push(JSON.stringify(updates.position));
        }
        if (updates.style) {
            fields.push('style = ?');
            values.push(JSON.stringify(updates.style));
        }
        if (updates.content !== undefined) {
            fields.push('content = ?');
            values.push(updates.content);
        }
        fields.push('updated_at = CURRENT_TIMESTAMP');
        const stmt = db.prepare(`
      UPDATE annotations SET ${fields.join(', ')} WHERE id = ?
    `);
        values.push(annotationId);
        stmt.run(...values);
        return { success: true };
    }
    catch (error) {
        throw error;
    }
});
electron_1.ipcMain.handle('annotations:delete', async (event, { annotationId, userId }) => {
    try {
        const annotation = db.prepare('SELECT document_id FROM annotations WHERE id = ?')
            .get(annotationId);
        if (!annotation) {
            throw new Error('Annotation not found');
        }
        db.prepare('DELETE FROM annotations WHERE id = ?').run(annotationId);
        logActivity(annotation.document_id, userId, 'annotation_deleted', { annotationId });
        return { success: true };
    }
    catch (error) {
        throw error;
    }
});
// ============================================================
// IPC Handlers - Comments
// ============================================================
electron_1.ipcMain.handle('comments:list', async (event, { annotationId }) => {
    try {
        const comments = db.prepare(`
      SELECT * FROM comments WHERE annotation_id = ? ORDER BY created_at ASC
    `).all(annotationId);
        return { success: true, comments };
    }
    catch (error) {
        throw error;
    }
});
electron_1.ipcMain.handle('comments:create', async (event, { annotationId, userId, content }) => {
    try {
        const id = generateId();
        const stmt = db.prepare(`
      INSERT INTO comments (id, annotation_id, user_id, content)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(id, annotationId, userId, content);
        return {
            success: true,
            comment: {
                id,
                annotationId,
                userId,
                content,
                resolved: false,
                createdAt: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        throw error;
    }
});
electron_1.ipcMain.handle('comments:resolve', async (event, { commentId }) => {
    try {
        db.prepare('UPDATE comments SET resolved = 1 WHERE id = ?').run(commentId);
        return { success: true };
    }
    catch (error) {
        throw error;
    }
});
// ============================================================
// Helper Functions
// ============================================================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
function logActivity(documentId, userId, activityType, metadata) {
    try {
        const stmt = db.prepare(`
      INSERT INTO activities (id, document_id, user_id, activity_type, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
        stmt.run(generateId(), documentId, userId, activityType, JSON.stringify(metadata));
    }
    catch (error) {
        console.error('Failed to log activity:', error);
    }
}
async function getPdfPageCount(filePath) {
    // Placeholder - would need pdf-parse or similar library
    // For now, return 1 as default
    try {
        const pdfParse = (await Promise.resolve().then(() => __importStar(require('pdf-parse')))).default;
        const dataBuffer = await promises_1.default.readFile(filePath);
        const data = await pdfParse(dataBuffer);
        return data.numpages;
    }
    catch (error) {
        console.warn('Could not get PDF page count:', error);
        return 1;
    }
}
// ============================================================
// Activities
// ============================================================
electron_1.ipcMain.handle('activities:list', async (event, { documentId }) => {
    try {
        const activities = db.prepare(`
      SELECT a.*, u.email, u.first_name, u.last_name
      FROM activities a
      JOIN users u ON a.user_id = u.id
      WHERE a.document_id = ?
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all(documentId);
        return {
            success: true,
            activities: activities.map((a) => ({
                ...a,
                metadata: a.metadata ? JSON.parse(a.metadata) : null,
            })),
        };
    }
    catch (error) {
        throw error;
    }
});
// ============================================================
// App Info
// ============================================================
electron_1.ipcMain.handle('app:get-version', () => {
    return electron_1.app.getVersion();
});
electron_1.ipcMain.handle('app:get-path', (event, name) => {
    if (name === 'documents') {
        return documentsPath;
    }
    return electron_1.app.getPath(name);
});
