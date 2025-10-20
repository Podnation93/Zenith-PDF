# Zenith PDF v2.0 - Enhanced Quick Start Guide

**Status:** Core features implemented and ready for development testing ✅

---

## What's New in This Build

### ✅ Security Enhancements
- **Password Strength Validation** using zxcvbn (industry standard)
- **Rate Limiting** on authentication (prevents brute force)
- **Enhanced Input Sanitization** for all user inputs
- **Content Security Policy** (CSP) implementation
- **Electron Security Best Practices** (context isolation, sandbox, etc.)

### ✅ Auto-Save System
- Automatic saving every 5 seconds (configurable)
- Force save on app quit (prevents data loss)
- Transaction-safe SQLite operations
- Real-time status tracking

### ✅ PDF Export Features
- Export PDFs with flattened annotations (permanent)
- Export annotations summary as separate PDF
- Support for all annotation types (highlight, underline, etc.)
- Native file save dialogs

### ✅ Build System
- Electron-builder configuration for all platforms
- Windows: NSIS installer + portable
- macOS: DMG + ZIP (universal binary support)
- Linux: AppImage + deb + rpm

---

## Development Setup

### Prerequisites
- Node.js 20+ and npm 10+
- Git (for version control)
- 4GB RAM minimum

### Installation

```bash
# 1. Navigate to project directory
cd E:\Programming\Zenith-PDF

# 2. Install dependencies (already done)
npm install
cd frontend && npm install && cd ..

# 3. Build Electron code
npm run build:electron

# 4. Run in development mode
npm run dev
```

**What happens when you run `npm run dev`:**
1. Vite dev server starts on http://localhost:5173
2. Electron app launches with dev tools
3. Hot reload enabled for both frontend and backend changes

---

## Testing the New Features

### 1. Test Security Features

#### Password Strength Validation
```javascript
// In frontend, when user registers:
const result = await window.electronAPI.auth.validatePassword(password, [email, firstName]);

// Returns:
{
  validation: {
    isValid: true/false,
    score: 0-4,
    feedback: {
      warning: "...",
      suggestions: ["..."]
    }
  }
}
```

**To test:**
1. Try weak password: "password123" → Should fail
2. Try strong password: "X7#mK9$pL2@nQ5" → Should pass
3. Try password with user info: "john@example.com" → Should fail

#### Rate Limiting
**To test:**
1. Try logging in with wrong password 6 times
2. You should be blocked after 5 attempts
3. Error message will show: "Too many failed attempts. Account temporarily locked."

### 2. Test Auto-Save

**To test:**
1. Open a PDF document
2. Create an annotation (highlight some text)
3. Wait 5 seconds
4. Close app without saving manually
5. Reopen app → Annotation should still be there

**Manual force save:**
```javascript
await window.electronAPI.autosave.forceSave();
```

**Check auto-save status:**
```javascript
const status = await window.electronAPI.autosave.getStatus();
// Returns: { enabled, pendingChanges, lastSaveTime }
```

### 3. Test PDF Export

**Export with flattened annotations:**
```javascript
// Let user choose save location
const { filePath } = await window.electronAPI.export.selectOutputPath();

if (filePath) {
  const result = await window.electronAPI.export.withAnnotations(
    documentId,
    filePath
  );
  // PDF saved with annotations permanently rendered
}
```

**Export annotations summary:**
```javascript
const result = await window.electronAPI.export.annotationsSummary(
  documentId
);
// Creates separate PDF listing all annotations
```

---

## Building Distributable Packages

### Build for Current Platform

```bash
# Build everything first
npm run build

# Package for Windows (on Windows)
npm run package:win

# Package for macOS (on macOS)
npm run package:mac

# Package for Linux (on Linux)
npm run package:linux
```

**Output:** Files will be in the `release/` directory

### Build for All Platforms (Cross-platform)

```bash
npm run package:all
```

**Note:** Some platform-specific builds require native tools:
- **macOS DMG:** Requires macOS
- **Windows NSIS:** Works on any platform
- **Linux deb/AppImage:** Works on any platform

---

## Project Structure

```
zenith-pdf/
├── electron/                    # Main process (Node.js + SQLite)
│   ├── main.ts                 # App entry, window management, IPC
│   ├── preload.ts              # IPC bridge (security layer)
│   ├── security.ts             # ✅ NEW: Password validation, rate limiting
│   ├── autosave.ts             # ✅ NEW: Auto-save manager
│   ├── pdfExport.ts            # ✅ NEW: PDF export service
│   └── tsconfig.json
│
├── frontend/                    # Renderer process (React + Vite)
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Login, Dashboard, Viewer
│   │   ├── services/           # API & WebSocket clients
│   │   ├── store/              # Zustand state management
│   │   └── types/
│   ├── dist/                   # Built frontend (after npm run build:frontend)
│   └── package.json
│
├── dist-electron/               # Built Electron code (JS)
│   ├── main.js
│   ├── preload.js
│   ├── security.js             # ✅ NEW
│   ├── autosave.js             # ✅ NEW
│   └── pdfExport.js            # ✅ NEW
│
├── resources/                   # Build resources
│   ├── icons/                  # Platform-specific icons (TODO)
│   ├── entitlements.mac.plist  # ✅ NEW: macOS permissions
│   └── ICONS_README.md         # ✅ NEW: Icon creation guide
│
├── release/                     # Built installers (after npm run package)
│   ├── Zenith-PDF-Setup-2.0.0.exe          # Windows installer
│   ├── Zenith-PDF-Portable-2.0.0.exe       # Windows portable
│   ├── Zenith-PDF-2.0.0-universal.dmg      # macOS installer
│   └── zenith-pdf-2.0.0-x86_64.AppImage   # Linux AppImage
│
├── electron-builder.json        # ✅ NEW: Build configuration
├── package.json
├── IMPLEMENTATION_PROGRESS.md   # ✅ NEW: Detailed progress report
└── QUICKSTART_ENHANCED.md       # This file
```

---

## Development Workflow

### Making Changes

#### Backend Changes (Electron Main Process)
1. Edit files in `electron/` (e.g., `main.ts`)
2. Run `npm run build:electron`
3. Restart Electron: `npm run dev`

#### Frontend Changes (React)
1. Edit files in `frontend/src/`
2. Changes hot-reload automatically (no restart needed)

### Testing Changes
1. Use Electron DevTools (opens automatically in dev mode)
2. Check console for errors
3. Test IPC communication
4. Verify database writes in SQLite

### Debugging

#### Enable Verbose Logging
```bash
# Windows
set DEBUG=* && npm run dev

# macOS/Linux
DEBUG=* npm run dev
```

#### Check SQLite Database
```bash
# Find database location
# Windows: C:\Users\<You>\AppData\Roaming\zenith-pdf\zenith.db
# macOS: ~/Library/Application Support/zenith-pdf/zenith.db
# Linux: ~/.config/zenith-pdf/zenith.db

# Open with SQLite browser
sqlite3 zenith.db
> .tables
> SELECT * FROM users;
> SELECT * FROM annotations;
```

---

## Common Tasks

### Add New IPC Handler

**1. Add handler in `electron/main.ts`:**
```typescript
ipcMain.handle('my-feature:do-something', async (event, { param }) => {
  // Do something
  return { success: true, data: result };
});
```

**2. Expose in `electron/preload.ts`:**
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  myFeature: {
    doSomething: (param: string) =>
      ipcRenderer.invoke('my-feature:do-something', { param }),
  },
});
```

**3. Add TypeScript types in `preload.ts`:**
```typescript
declare global {
  interface Window {
    electronAPI: {
      myFeature: {
        doSomething: (param: string) => Promise<any>;
      };
    };
  }
}
```

**4. Use in frontend:**
```typescript
const result = await window.electronAPI.myFeature.doSomething('test');
```

### Add New Database Table

**Edit `electron/main.ts` in `initializeDatabase()`:**
```typescript
db.exec(`
  CREATE TABLE IF NOT EXISTS my_table (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
```

---

## Troubleshooting

### Build Errors

**"Cannot find module 'pdf-lib'"**
```bash
npm install pdf-lib --save
npm run build:electron
```

**"Cannot find module 'zxcvbn'"**
```bash
npm install zxcvbn @types/zxcvbn --save
npm run build:electron
```

### Runtime Errors

**"Database is locked"**
- Only one app instance can access the database
- Close all Zenith PDF windows and restart

**"Failed to load resource: net::ERR_FILE_NOT_FOUND"**
- Frontend not built yet
- Run: `cd frontend && npm run build`

**"IpcMain handler not found"**
- Rebuild Electron code: `npm run build:electron`
- Restart app: `npm run dev`

### Performance Issues

**Slow startup:**
- Database too large → Optimize queries
- Too many auto-save pending changes → Reduce interval

**Memory leaks:**
- Check for unclosed database connections
- Monitor with Electron DevTools Performance tab

---

## Security Checklist Before Release

- [ ] Change JWT_SECRET in production (don't use default)
- [ ] Enable code signing for Windows and macOS
- [ ] Test rate limiting thoroughly
- [ ] Review all IPC handlers for authorization
- [ ] Audit npm dependencies (`npm audit`)
- [ ] Test with real user data (GDPR compliance)
- [ ] Add privacy policy and terms of service
- [ ] Set up error reporting (e.g., Sentry)

---

## Next Development Priorities

Based on the specification and remaining tasks:

### High Priority
1. **Keyboard Shortcuts** (improve UX)
2. **Application Icons** (branding)
3. **Auto-Update System** (electron-updater)

### Medium Priority
4. **OS Integration** (context menu, default handler)
5. **Comprehensive Testing** (unit + integration)
6. **Documentation Updates** (user guides)

### Low Priority (Future)
7. Advanced annotation tools (shapes, drawing)
8. PDF form filling
9. Digital signatures
10. Optional cloud sync

---

## Resources

### Documentation
- [Electron Docs](https://www.electronjs.org/docs)
- [electron-builder Docs](https://www.electron.build/)
- [SQLite Docs](https://www.sqlite.org/docs.html)
- [pdf-lib Docs](https://pdf-lib.js.org/)
- [zxcvbn Docs](https://github.com/dropbox/zxcvbn)

### Tools
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [Electron Fiddle](https://www.electronjs.org/fiddle)
- [Electron DevTools](https://www.electronjs.org/docs/latest/tutorial/devtools-extension)

### Community
- [Electron Discord](https://discord.com/invite/electronjs)
- [Stack Overflow - Electron](https://stackoverflow.com/questions/tagged/electron)

---

## Quick Reference: npm Scripts

```bash
# Development
npm run dev                  # Start dev server + Electron
npm run dev:frontend         # Start Vite only
npm run dev:electron         # Start Electron only

# Building
npm run build               # Build frontend + Electron
npm run build:frontend      # Build frontend only
npm run build:electron      # Build Electron only (TypeScript → JavaScript)

# Packaging
npm run package             # Package for current platform
npm run package:win         # Windows installer
npm run package:mac         # macOS DMG
npm run package:linux       # Linux AppImage/deb/rpm
npm run package:all         # All platforms
npm run dist                # Build without publishing

# Testing & Quality
npm run test                # Run frontend tests
npm run lint                # Run ESLint
```

---

## Getting Help

1. **Check logs:**
   - Electron console (DevTools)
   - Terminal output
   - SQLite database contents

2. **Review documentation:**
   - This file
   - `IMPLEMENTATION_PROGRESS.md`
   - `DESKTOP_MIGRATION.md`
   - `PROJECT_SUMMARY.md`

3. **Search issues:**
   - Electron GitHub issues
   - Stack Overflow
   - Project README

4. **Ask for help:**
   - Open GitHub issue
   - Discord/Slack community
   - Email support team

---

**Ready to start developing! 🚀**

Run `npm run dev` and start building amazing features for Zenith PDF!
