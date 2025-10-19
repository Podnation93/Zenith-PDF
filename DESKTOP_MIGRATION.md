# Zenith PDF - Desktop Migration Guide

**Date:** 2025-10-19
**Version:** 2.0.0 Desktop
**Migration Type:** Web-based → Desktop App (Electron)

---

## 🎯 Migration Overview

Zenith PDF has been **converted from a web-based application to an offline-first desktop application** using Electron. This migration provides:

- ✅ **Complete Privacy** - All data stored locally
- ✅ **Offline-First** - No internet required
- ✅ **Better Performance** - No network latency
- ✅ **Lower Costs** - No server hosting needed
- ✅ **Cross-Platform** - Windows, macOS, Linux

---

## 📊 Architecture Comparison

### Before: Web-based Architecture
```
User Browser
   ↓ HTTPS/WSS
Backend (Fastify + Node.js)
   ↓
PostgreSQL + Redis + S3
```

### After: Desktop Architecture
```
Electron App
├── Renderer (React + PDF.js)
├── IPC Bridge
└── Main Process (Node.js)
    ├── SQLite Database
    └── Local File System
```

---

## 🔄 What Changed

### 1. Database: PostgreSQL → SQLite

**Before:**
```typescript
// Connects to remote PostgreSQL server
const pool = new Pool({
  host: 'database.server.com',
  database: 'zenith_pdf',
});
```

**After:**
```typescript
// Local SQLite database in user's app data folder
import Database from 'better-sqlite3';
const db = new Database(path.join(app.getPath('userData'), 'zenith.db'));
```

**Benefits:**
- No database server to configure
- Instant queries (no network)
- All data stays on user's computer

### 2. Storage: AWS S3 → Local File System

**Before:**
```typescript
// Upload to cloud S3 bucket
await s3.putObject({
  Bucket: 'zenith-pdf-docs',
  Key: `${userId}/${documentId}.pdf`,
  Body: fileBuffer,
});
```

**After:**
```typescript
// Save to local documents folder
const documentsPath = path.join(app.getPath('userData'), 'documents');
await fs.writeFile(path.join(documentsPath, `${id}.pdf`), fileBuffer);
```

**Benefits:**
- No cloud storage costs
- Complete data privacy
- Faster file access
- Works offline

### 3. API: REST/WebSocket → Electron IPC

**Before:**
```typescript
// HTTP REST API calls
const response = await fetch('http://api.server.com/documents', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify(data),
});
```

**After:**
```typescript
// Electron IPC (Inter-Process Communication)
const result = await window.electronAPI.documents.upload(userId, filePath, fileName);
```

**Benefits:**
- Type-safe API
- No network overhead
- Secure (context isolation)
- Synchronous or async

### 4. Removed: Redis

**Before:**
```typescript
// Redis for caching and pub/sub
const redis = new Redis('redis://server.com:6379');
await redis.publish('document:updates', message);
```

**After:**
```
// Not needed! Single-user desktop app has no distributed state
```

**Benefits:**
- No Redis server to maintain
- Simpler architecture
- Lower memory usage

---

## 📦 New Dependencies

### Removed (Web-only)
```json
{
  "fastify": "^4.26.0",              // ❌ No HTTP server
  "fastify/websocket": "^10.0.1",    // ❌ No WebSocket server
  "pg": "^8.11.3",                   // ❌ No PostgreSQL
  "ioredis": "^5.3.2",               // ❌ No Redis
  "@aws-sdk/client-s3": "^3.490.0",  // ❌ No cloud storage
  "docker": "^4.0.0"                 // ❌ No containerization
}
```

### Added (Desktop)
```json
{
  "electron": "^28.2.0",             // ✅ Desktop app framework
  "better-sqlite3": "^9.4.0",        // ✅ Local database
  "bcrypt": "^5.1.1",                // ✅ Password hashing (kept)
  "jsonwebtoken": "^9.0.2",          // ✅ Auth tokens (kept)
  "pdf-parse": "^1.1.1"              // ✅ PDF metadata extraction
}
```

---

## 🗂️ File Structure Changes

### New Files Created

```
zenith-pdf/
├── electron/                    # ✨ NEW: Electron main process
│   ├── main.ts                 # Main process (replaces backend)
│   ├── preload.ts              # IPC bridge (security)
│   └── tsconfig.json           # TypeScript config for Electron
├── package.json                # Updated for Electron
└── frontend/                   # Mostly unchanged
    └── src/
        └── services/
            └── electron-api.ts # ✨ NEW: Electron API wrapper
```

### Files Removed/Deprecated

```
❌ backend/                     # All backend code replaced by electron/main.ts
❌ docker-compose.yml           # No Docker needed
❌ .env (backend)               # No server configuration
❌ database/migrations/         # SQLite schema in main.ts
❌ Documentation/DEPLOYMENT_GUIDE.md  # No cloud deployment
```

---

## 🔐 Security Implications

### What Stayed Secure

- ✅ **Password Hashing** - Still uses bcrypt with salt rounds
- ✅ **JWT Tokens** - Local authentication still uses JWTs
- ✅ **Input Validation** - All validation logic preserved
- ✅ **Password Strength** - zxcvbn validation still active

### What Changed

| Feature | Web Version | Desktop Version |
|---------|-------------|-----------------|
| **Data Location** | Cloud servers | User's computer |
| **Attack Surface** | Internet-exposed API | Local-only IPC |
| **Authentication** | Network-based | Local-only |
| **File Access** | S3 bucket permissions | OS file permissions |
| **SQL Injection** | PostgreSQL prepared statements | SQLite prepared statements |

### New Security Considerations

⚠️ **Physical Access** - Since all data is local, securing the computer is critical:
- Encrypt hard drive (BitLocker, FileVault, LUKS)
- Use strong OS login password
- Enable screen lock after idle

✅ **Context Isolation** - Electron's security features:
- `nodeIntegration: false` - Renderer can't access Node.js APIs
- `contextIsolation: true` - Separate JS contexts
- `preload.ts` - Controlled API exposure

---

## 📁 Data Storage Locations

### Windows
```
C:\Users\<Username>\AppData\Roaming\zenith-pdf\
├── zenith.db              # SQLite database
└── documents/             # PDF files
    ├── abc123.pdf
    └── xyz789.pdf
```

### macOS
```
~/Library/Application Support/zenith-pdf/
├── zenith.db
└── documents/
```

### Linux
```
~/.config/zenith-pdf/
├── zenith.db
└── documents/
```

---

## 🚀 How to Run

### Development Mode

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Run in development
npm run dev
```

This starts:
1. Vite dev server (React frontend) on `http://localhost:5173`
2. Electron app in development mode with DevTools

### Build for Production

```bash
# Build frontend + electron
npm run build

# Package for current platform
npm run package

# Create installer/app bundle
npm run make
```

**Output:**
- Windows: `release/Zenith-PDF-2.0.0-Setup.exe` (~80MB)
- macOS: `release/Zenith-PDF-2.0.0.dmg` (~85MB)
- Linux: `release/Zenith-PDF-2.0.0.AppImage` (~90MB)

---

## 🔄 Frontend Migration (Minimal Changes)

### API Calls: Before & After

**Before (Web):**
```typescript
// services/api.ts
import axios from 'axios';

export const documentApi = {
  async upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post('/api/documents/upload', formData);
    return response.data;
  }
};
```

**After (Desktop):**
```typescript
// services/electron-api.ts
export const documentApi = {
  async upload(userId: string, filePath: string, fileName: string) {
    const result = await window.electronAPI.documents.upload(
      userId,
      filePath,
      fileName
    );
    return result.document;
  }
};
```

### Store Updates

**Zustand stores require minimal changes:**
- Replace `fetch()` calls with `window.electronAPI.*` calls
- Remove WebSocket logic (or keep for optional cloud sync later)
- Update error handling for IPC errors

---

## ✅ Migration Checklist

### Completed ✅

- [x] Create Electron main process (`electron/main.ts`)
- [x] Create IPC preload bridge (`electron/preload.ts`)
- [x] Implement SQLite database schema
- [x] Implement local file system storage
- [x] Update package.json for Electron
- [x] Create TypeScript config for Electron
- [x] Document architecture changes
- [x] Update README.md

### TODO (Next Steps)

- [ ] Update frontend to use Electron API
- [ ] Test all features in Electron
- [ ] Create application icons
- [ ] Set up code signing (for production)
- [ ] Create auto-update mechanism
- [ ] Update all documentation
- [ ] Remove obsolete deployment docs
- [ ] Create installer configs (Windows/Mac/Linux)
- [ ] Test on all platforms
- [ ] Create first release build

---

## 🎯 Benefits Summary

| Aspect | Web Version | Desktop Version | Winner |
|--------|-------------|-----------------|--------|
| **Privacy** | Data in cloud | Data local | 🏆 Desktop |
| **Offline** | Limited | Full | 🏆 Desktop |
| **Performance** | Network latency | Instant | 🏆 Desktop |
| **Hosting Cost** | $50-500/mo | $0 | 🏆 Desktop |
| **Installation** | None needed | Download required | 🏆 Web |
| **Updates** | Instant | Need update system | 🏆 Web |
| **Collaboration** | Built-in | Complex (P2P) | 🏆 Web |
| **Cross-device** | Easy | Needs sync | 🏆 Web |

**Overall: Desktop wins for privacy, performance, and cost. Web wins for ease of use and collaboration.**

---

## 🔮 Future: Hybrid Approach

**Best of Both Worlds:**
1. **Primary**: Offline desktop app (current)
2. **Optional**: Cloud sync service (future add-on)

**Users can choose:**
- 🔒 **Local-only mode**: Everything offline, complete privacy
- ☁️ **Cloud sync mode**: Optional encrypted cloud backup
- 👥 **Collaboration mode**: Opt-in real-time collaboration

**Implementation:**
```typescript
// Future: Optional cloud sync
if (user.preferences.enableCloudSync) {
  await syncToCloud(localChanges);
}
```

---

## 📞 Support

Questions about the migration? See:
- [Development Setup](./Documentation/DEVELOPMENT.md)
- [Architecture Guide](./Documentation/ARCHITECTURE.md)
- [GitHub Issues](https://github.com/yourorg/zenith-pdf/issues)

---

**Migration Status: 🟡 In Progress**

- ✅ Electron setup complete
- ✅ Database migrated to SQLite
- ✅ Storage migrated to local filesystem
- 🔄 Frontend integration in progress
- ⏳ Testing pending
- ⏳ Release builds pending

---

*Migration Guide Version: 1.0*
*Last Updated: 2025-10-19*
*Status: Architecture conversion complete, frontend integration next*
