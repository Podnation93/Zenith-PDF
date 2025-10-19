# Installation Troubleshooting - Zenith PDF

## ⚠️ IMPORTANT: Google Drive Installation Issues

**The npm cache on Google Drive is experiencing corruption due to file system limitations.** This is a known issue with npm on cloud-synced drives.

## ✅ SOLUTION: Move Project to Local Drive

### Quick Fix (Recommended)

**1. Copy project to local drive:**

```bash
# Windows PowerShell
xcopy "G:\My Drive\Programming\Zenith-PDF" "C:\zenith-pdf" /E /I /H /Y

# Or use Windows Explorer (drag and drop)
```

**2. Navigate to new location:**

```bash
cd C:\zenith-pdf
```

**3. Install dependencies:**

```bash
npm install
```

**4. Start Docker and run:**

```bash
npm run docker:up
npm run dev
```

This should work without any issues!

## Alternative: Manual Installation

If you must keep the project on Google Drive:

### Step 1: Clear npm Cache

```bash
npm cache clean --force
```

### Step 2: Install with Different Strategy

```bash
# Install backend with legacy peer deps
cd backend
npm install --legacy-peer-deps --no-optional --prefer-offline=false

# Install frontend
cd ../frontend
npm install --legacy-peer-deps --no-optional --prefer-offline=false

# Install root
cd ..
npm install concurrently --save-dev
```

### Step 3: If Still Failing

Try using yarn instead of npm:

```bash
# Install yarn globally
npm install -g yarn

# Install with yarn
cd backend
yarn install

cd ../frontend
yarn install
```

## Why This Happens

Google Drive (and other cloud storage):
1. **File locking conflicts** - Cloud sync interferes with npm's file operations
2. **Slow I/O** - Network syncing slows down thousands of small file operations
3. **Permission issues** - Cloud drives sometimes have restrictive permissions
4. **Tar extraction** - npm cache corruption during tar extraction

## Recommended Setup

For best development experience:

```
C:\zenith-pdf           ← Your working directory (local SSD)
│
G:\My Drive\Backups     ← Periodic backups only
```

### Backup Strategy

Use git for version control and manual backups:

```bash
# Work on local drive
cd C:\zenith-pdf

# Commit changes
git add .
git commit -m "Your changes"

# Periodic backup to Google Drive (optional)
robocopy C:\zenith-pdf "G:\My Drive\Backups\Zenith-PDF" /MIR /XD node_modules .git dist build
```

## Verification After Installation

Once installed successfully, verify everything works:

```bash
# Check installations
cd C:\zenith-pdf
npm list --depth=0

# Check backend
cd backend
npm list --depth=0

# Check frontend
cd frontend
npm list --depth=0
```

## Still Having Issues?

### Option 1: Use Docker for Everything

```bash
# Use Docker to run Node.js without local npm
docker run -it --rm -v ${PWD}:/app -w /app node:20 npm install
```

### Option 2: Use Windows Subsystem for Linux (WSL)

```bash
# In WSL
cd /mnt/c/zenith-pdf
npm install
```

### Option 3: Fresh Start

```bash
# Delete node_modules everywhere
rm -rf node_modules backend/node_modules frontend/node_modules

# Delete package-lock files
rm -rf package-lock.json backend/package-lock.json frontend/package-lock.json

# Clear cache
npm cache clean --force

# Try again
npm install
```

## What's Already Working

Even without npm install completing, you have:

✅ **Complete source code** - All files are created
✅ **Database schema** - Ready in backend/database/init.sql
✅ **Docker configuration** - Can start services
✅ **Documentation** - All guides written

The only blocker is node_modules installation!

## Contact & Support

If none of these solutions work:
1. Check GitHub issues for similar problems
2. Try on a different machine
3. Use the Docker-based development approach

**Bottom line: Move to local drive for best results!** 🚀
