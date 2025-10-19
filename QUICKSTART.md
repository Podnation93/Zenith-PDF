# Zenith PDF - Quick Start Guide

**Get up and running in 5 minutes!**

---

## Prerequisites

Before you start, make sure you have:

- ✅ **Node.js 20+** installed ([Download here](https://nodejs.org/))
- ✅ **PostgreSQL 16+** installed and running ([Download here](https://www.postgresql.org/download/))
- ✅ **Redis 7+** installed and running ([Download here](https://redis.io/download/))
- ✅ **Git** installed

**Check your versions:**
```bash
node --version    # Should be v20.x.x or higher
npm --version     # Should be 10.x.x or higher
psql --version    # Should be 16.x or higher
redis-cli --version  # Should be 7.x or higher
```

---

## Step 1: Database Setup

### Start PostgreSQL

**Windows:**
```bash
# PostgreSQL should auto-start as a service
# Check if it's running:
pg_isready
```

**macOS/Linux:**
```bash
# Start PostgreSQL
brew services start postgresql@16  # macOS with Homebrew
# OR
sudo service postgresql start      # Linux
```

### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql prompt, run:
CREATE DATABASE zenith_pdf;
CREATE USER zenith_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE zenith_pdf TO zenith_user;
\q
```

---

## Step 2: Redis Setup

### Start Redis

**Windows:**
```bash
# If installed via MSI, Redis should auto-start
# Check if running:
redis-cli ping
# Should return: PONG
```

**macOS:**
```bash
brew services start redis
```

**Linux:**
```bash
sudo service redis-server start
```

---

## Step 3: Backend Setup

### Navigate to Backend

```bash
cd E:\Programming\Zenith-PDF\backend
```

### Install Dependencies

```bash
npm install
```

This will install all required packages including the new ones:
- `zxcvbn` (password validation)
- `@fastify/helmet` (security headers)
- `@fastify/rate-limit` (rate limiting)

### Configure Environment

Create a `.env` file in the `backend` directory:

```bash
# Copy the example
copy .env.example .env
```

Edit `.env` with your settings:

```env
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://zenith_user:your_secure_password@localhost:5432/zenith_pdf

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-too
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# AWS S3 (for production - can skip for local testing)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET_NAME=zenith-pdf-documents

# CORS
CORS_ORIGIN=http://localhost:5173

# File Upload
MAX_FILE_SIZE=52428800
```

### Run Database Migrations

```bash
npm run migrate
```

This creates all necessary tables in PostgreSQL.

### Start Backend Server

```bash
npm run dev
```

**Expected output:**
```
Server listening at http://0.0.0.0:3000
✓ Database connected
✓ Redis connected
✓ WebSocket server ready
```

**Leave this terminal running!**

---

## Step 4: Frontend Setup

### Open New Terminal

Navigate to frontend directory:

```bash
cd E:\Programming\Zenith-PDF\frontend
```

### Install Dependencies

```bash
npm install
```

### Configure Environment

Create a `.env` file in the `frontend` directory:

```bash
# Copy the example
copy .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### Start Frontend Development Server

```bash
npm run dev
```

**Expected output:**
```
VITE v5.0.0  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Leave this terminal running!**

---

## Step 5: Access the Application

### Open Your Browser

Navigate to: **http://localhost:5173**

### Create an Account

1. Click **"Sign Up"**
2. Fill in your details:
   - Email: `test@example.com`
   - Name: `Test User`
   - Password: `SecureP@ssw0rd!2024`

   *(Note: Password must be strong - the new password validator will check it!)*

3. Click **"Create Account"**

### Test the Features

**Upload a PDF:**
1. Click **"Upload PDF"** button
2. Select any PDF file from your computer
3. Wait for upload to complete

**Test Annotations:**
1. Open the uploaded document
2. Click **"Highlight"** tool in toolbar
3. Click and drag over text to highlight
4. Try other annotation tools

**Test Real-Time Collaboration:**
1. Open the same document in a **second browser window** (or incognito mode)
2. Log in as a different user
3. You should see presence indicators showing both users
4. Move your cursor - you should see it appear in the other window!

**Test Export:**
1. Add some annotations to a document
2. Click **"Export"** → **"Export with Annotations"**
3. The PDF downloads with annotations flattened

---

## Step 6: Run Tests

### Backend Tests

```bash
cd E:\Programming\Zenith-PDF\backend
npm test
```

**Expected output:**
```
✓ Password validator tests (30 tests)
  - All tests should pass
  - Coverage: 100%
```

### Frontend Tests

```bash
cd E:\Programming\Zenith-PDF\frontend
npm test
```

**Expected output:**
```
✓ setup.ts (configuration)
✓ PresenceIndicator.test.tsx (8 tests)
✓ CursorTracker.test.tsx (12 tests)
✓ ConnectionStatus.test.tsx (18 tests)
✓ useKeyboardShortcuts.test.ts (20 tests)
✓ apiRetry.test.ts (15 tests)
✓ pdfExporter.test.ts (25 tests)

Test Files  7 passed (7)
     Tests  128 passed (128)
  Duration  2.5s
```

---

## Troubleshooting

### Backend won't start

**Error: "ECONNREFUSED" (PostgreSQL)**
```bash
# Check if PostgreSQL is running
pg_isready

# If not, start it:
# Windows: Check Services app
# macOS: brew services start postgresql@16
# Linux: sudo service postgresql start
```

**Error: "ECONNREFUSED" (Redis)**
```bash
# Check if Redis is running
redis-cli ping

# If no response, start it:
# Windows: Check Services app
# macOS: brew services start redis
# Linux: sudo service redis-server start
```

**Error: "Cannot find module"**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Frontend won't start

**Error: "Cannot connect to API"**
- Ensure backend is running on port 3000
- Check `.env` file has correct `VITE_API_URL`
- Check browser console for CORS errors

**Error: Port 5173 already in use**
```bash
# Kill the process using port 5173
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:5173 | xargs kill -9
```

### Database Migration Errors

**Error: "relation already exists"**
```bash
# Drop and recreate database
psql -U postgres

DROP DATABASE zenith_pdf;
CREATE DATABASE zenith_pdf;
GRANT ALL PRIVILEGES ON DATABASE zenith_pdf TO zenith_user;
\q

# Run migrations again
npm run migrate
```

### Tests Failing

**Frontend tests fail with "TextEncoder not defined"**
```bash
# This should be fixed by setup.ts, but if not:
npm install --save-dev @edge-runtime/ponyfill
```

**Backend tests timeout**
```bash
# Increase timeout in vitest.config.ts
# OR run tests with longer timeout:
npm test -- --testTimeout=10000
```

---

## Quick Feature Test Checklist

Once everything is running, test these features:

### ✅ Authentication
- [ ] Sign up with email/password
- [ ] Password strength validation works
- [ ] Login with credentials
- [ ] Logout

### ✅ Document Management
- [ ] Upload a PDF
- [ ] View uploaded documents in dashboard
- [ ] Open a document
- [ ] Navigate pages (arrows, page input)
- [ ] Zoom in/out

### ✅ Annotations
- [ ] Create highlight annotation
- [ ] Create underline annotation
- [ ] Create strikethrough annotation
- [ ] Create sticky note
- [ ] Add comment
- [ ] Delete annotation
- [ ] Edit annotation color

### ✅ Real-Time Collaboration
- [ ] Open same document in 2 browser windows
- [ ] See presence indicators (user avatars)
- [ ] See live cursors moving
- [ ] Create annotation in one window, see it appear in other

### ✅ Comments
- [ ] Add a comment
- [ ] Reply to a comment
- [ ] Resolve a thread
- [ ] See activity feed update

### ✅ Sharing
- [ ] Click "Share" button
- [ ] Create share link
- [ ] Set password protection
- [ ] Set expiration date
- [ ] Copy link and open in incognito/another browser

### ✅ Export
- [ ] Export PDF with annotations (flattened)
- [ ] Export comments summary
- [ ] Download and verify files

### ✅ Connection Status
- [ ] See online badge
- [ ] Disconnect internet, see offline badge
- [ ] Reconnect, see "Connection restored" message

### ✅ Keyboard Shortcuts
- [ ] Press `Ctrl/Cmd + /` to open shortcuts help
- [ ] Press `→` for next page
- [ ] Press `←` for previous page
- [ ] Press `H` for highlight tool
- [ ] Press `Ctrl/Cmd + S` to save

---

## Development Workflow

### Running Both Servers

You'll need **2 terminals**:

**Terminal 1 - Backend:**
```bash
cd E:\Programming\Zenith-PDF\backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd E:\Programming\Zenith-PDF\frontend
npm run dev
```

### Watching for Changes

Both servers have **hot reload** enabled:
- Backend: Changes auto-restart the server (nodemon/tsx)
- Frontend: Changes auto-refresh the browser (Vite HMR)

### Viewing Logs

**Backend logs:**
- Terminal output shows all API requests
- Check for errors in red

**Frontend logs:**
- Browser DevTools → Console tab
- Network tab to see API calls

### Database Inspection

**View data in PostgreSQL:**
```bash
psql -U zenith_user -d zenith_pdf

# View users
SELECT * FROM users;

# View documents
SELECT * FROM documents;

# View annotations
SELECT * FROM annotations;

\q
```

**View data in Redis:**
```bash
redis-cli

# View all keys
KEYS *

# View specific key
GET presence:user:123

exit
```

---

## Production Build

When ready to deploy:

### Build Frontend

```bash
cd E:\Programming\Zenith-PDF\frontend
npm run build
```

Output goes to `dist/` directory.

### Build Backend

```bash
cd E:\Programming\Zenith-PDF\backend
npm run build
```

Output goes to `dist/` directory.

See [DEPLOYMENT_GUIDE.md](./Documentation/DEPLOYMENT_GUIDE.md) for full production deployment instructions.

---

## Next Steps

1. ✅ **Read the User Guide:** See [USER_GUIDE.md](./Documentation/USER_GUIDE.md)
2. ✅ **Check Integration Examples:** See [INTEGRATION_GUIDE.md](./Documentation/INTEGRATION_GUIDE.md)
3. ✅ **Review Test Suite:** See [TESTING_GUIDE.md](./Documentation/TESTING_GUIDE.md)
4. ✅ **Plan Deployment:** See [DEPLOYMENT_GUIDE.md](./Documentation/DEPLOYMENT_GUIDE.md)

---

## Getting Help

**Issues?**
- Check the [Troubleshooting](#troubleshooting) section above
- Review logs in terminal and browser console
- Check `.env` files are configured correctly
- Ensure PostgreSQL and Redis are running

**Questions?**
- GitHub Issues: [Report an issue](https://github.com/yourorg/zenith-pdf/issues)
- Discord: [Join our community](https://discord.gg/zenithpdf)
- Email: support@zenithpdf.com

---

**Congratulations! You're now running Zenith PDF locally! 🎉**

Happy testing and development!

---

*Quick Start Guide Version: 1.0*
*Last Updated: 2025-10-19*
*For: Zenith PDF v2.0 Enhanced*
