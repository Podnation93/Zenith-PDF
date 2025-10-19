# Quick Start Guide - Zenith PDF v2.0

## Google Drive Installation Issues?

If you're experiencing npm install issues on Google Drive (file permission errors), **move the project to your local drive first**:

### Option 1: Copy to Local Drive (Recommended)

```bash
# Windows
xcopy "G:\My Drive\Programming\Zenith-PDF" "C:\Projects\Zenith-PDF" /E /I /H
cd C:\Projects\Zenith-PDF

# Mac/Linux
cp -r "/path/to/Google Drive/Zenith-PDF" ~/Projects/Zenith-PDF
cd ~/Projects/Zenith-PDF
```

### Option 2: Install Each Workspace Separately

If you must stay on Google Drive:

```bash
# Install backend
cd backend
npm install --no-optional

# Install frontend
cd ../frontend
npm install --no-optional

# Install root (just concurrently)
cd ..
npm install concurrently
```

## 5-Minute Setup

Once on local drive or after manual installation:

### 1. Start Docker Services
```bash
npm run docker:up
```

Wait ~30 seconds for services to start.

### 2. Create MinIO Bucket
1. Open http://localhost:9001
2. Login: `minioadmin` / `minioadmin`
3. Buckets → Create Bucket → `zenith-pdf-documents`

### 3. Start Dev Servers
```bash
npm run dev
```

### 4. Open Application
http://localhost:5173

**Login with test user:**
- Email: `test@zenith-pdf.com`
- Password: `testpassword123`

Or register a new account.

## Verify Everything Works

### Check Backend Health
```bash
curl http://localhost:3000/health
```

Expected: `{"status":"healthy",...}`

### Check Database
```bash
docker exec -it zenith-postgres psql -U zenith_user -d zenith_pdf -c "SELECT COUNT(*) FROM users;"
```

Expected: At least 1 user

### Check Frontend
Open http://localhost:5173 - should see login page with no console errors

## Common Issues

### Port 3000 Already in Use
```bash
# Kill process
npx kill-port 3000

# Or change port in backend/.env
PORT=3001
```

### Docker Services Won't Start
```bash
# Check Docker is running
docker ps

# Restart services
npm run docker:down
npm run docker:up
```

### MinIO Bucket Errors
1. Verify bucket exists in MinIO console
2. Check `S3_BUCKET=zenith-pdf-documents` in backend/.env
3. Restart backend

## Next Steps

1. **Upload a PDF** - Test document management
2. **Open in Two Windows** - Test real-time WebSocket connection
3. **Check Documentation** - See README.md for architecture details
4. **Start Developing** - Pick a feature to implement!

## What to Implement Next

The backend is ~95% complete. Focus on these frontend features:

1. **PDF.js Integration** - Render PDFs in DocumentViewer
2. **Annotation UI** - Drawing tools for highlights/comments
3. **Comment Threads** - UI for discussions
4. **Presence Indicators** - Show active users
5. **Export Functionality** - Flatten annotations with pdf-lib

## Need Help?

- See [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed setup
- See [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for implementation status
- See [README.md](./README.md) for architecture overview

## Architecture at a Glance

```
Backend (Fastify + PostgreSQL + Redis)
├── Authentication (JWT)
├── Document Management (S3/MinIO)
├── Real-time Collaboration (WebSocket + Redis Pub/Sub)
├── CRDT Annotations
└── Comment System with @mentions

Frontend (React + TypeScript + Vite)
├── Auth Pages (Login/Register) ✅
├── Dashboard (Upload/List) ✅
├── Document Viewer (Foundation) ⏳
├── PDF Rendering (PDF.js) ⏳
├── Annotation Tools ⏳
└── Comment UI ⏳
```

✅ = Complete | ⏳ = Needs Implementation

**You're ready to start! 🚀**
