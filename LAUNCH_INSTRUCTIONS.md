# 🚀 Launch Instructions - Zenith PDF

## Prerequisites Checklist

✅ Node.js 20+ installed (`node --version`)
✅ npm 10+ installed (`npm --version`)
✅ Docker Desktop installed and running
✅ Git Bash or PowerShell (Windows)

## Step 1: Move Project to Local Drive (REQUIRED!)

**Why?** Google Drive causes npm installation errors.

```bash
# Windows PowerShell
xcopy "G:\My Drive\Programming\Zenith-PDF" "C:\zenith-pdf" /E /I /H /Y

# Navigate to new location
cd C:\zenith-pdf
```

## Step 2: Install Dependencies

```bash
# Install all dependencies (takes 2-3 minutes)
npm install
```

You should see:
```
added 1200+ packages in 2m
```

If you see errors, try:
```bash
npm install --legacy-peer-deps
```

## Step 3: Start Docker Services

```bash
# Start PostgreSQL, Redis, and MinIO
npm run docker:up
```

You should see:
```
✔ Container zenith-postgres  Started
✔ Container zenith-redis     Started
✔ Container zenith-minio     Started
```

**Wait 30 seconds** for services to initialize.

### Verify Docker Services

```bash
# Check all containers are running
docker ps
```

You should see 3 containers: `zenith-postgres`, `zenith-redis`, `zenith-minio`

## Step 4: Setup MinIO (S3 Storage)

1. **Open MinIO Console**: http://localhost:9001

2. **Login**:
   - Username: `minioadmin`
   - Password: `minioadmin`

3. **Create Bucket**:
   - Click "Buckets" in left sidebar
   - Click "Create Bucket" button
   - Bucket Name: `zenith-pdf-documents`
   - Click "Create Bucket"

4. **Set Public Access** (optional, for easier dev):
   - Click on the bucket
   - Go to "Access" tab
   - Change policy to "Public"

## Step 5: Verify Backend Environment

Check that backend/.env exists:

```bash
# Should show the .env file
ls backend/.env
```

If it doesn't exist, copy from example:

```bash
cd backend
cp .env.example .env
cd ..
```

## Step 6: Start Development Servers

```bash
# Start both backend and frontend (runs in parallel)
npm run dev
```

You should see:
```
> zenith-pdf@2.0.0 dev
> concurrently "npm run dev:backend" "npm run dev:frontend"

[backend] ✅ Database connected
[backend] 🚀 Zenith PDF Backend running at http://0.0.0.0:3000
[frontend] VITE ready in 500ms
[frontend] ➜ Local: http://localhost:5173/
```

**Keep this terminal open!** The servers are running.

## Step 7: Access the Application

### Open Your Browser

**Frontend**: http://localhost:5173

You should see the Zenith PDF login page!

### Test with Default User

**Login with test account**:
- Email: `test@zenith-pdf.com`
- Password: `testpassword123`

Or **register a new account** - click "Sign up"

## Step 8: Verify Everything Works

### Test Backend Health

Open a new terminal:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### Test Database Connection

```bash
docker exec -it zenith-postgres psql -U zenith_user -d zenith_pdf -c "SELECT COUNT(*) FROM users;"
```

Expected:
```
 count
-------
     1
```

### Test Upload

1. Login to http://localhost:5173
2. Click "Upload PDF"
3. Select any PDF file
4. Should upload successfully and appear in your document list!

## Common Issues & Solutions

### Issue: "Port 3000 already in use"

```bash
# Kill process on port 3000
npx kill-port 3000

# Or change port in backend/.env
# PORT=3001
```

### Issue: "Docker containers won't start"

```bash
# Check Docker Desktop is running
docker ps

# If not working, restart Docker Desktop
# Then try again:
npm run docker:down
npm run docker:up
```

### Issue: "Cannot connect to database"

```bash
# Check PostgreSQL is healthy
docker logs zenith-postgres

# Should see: "database system is ready to accept connections"

# If not, recreate database:
npm run docker:down
docker volume rm zenith-pdf_postgres_data
npm run docker:up
```

### Issue: "Upload fails - Bucket not found"

1. Verify MinIO bucket exists: http://localhost:9001
2. Bucket name must be exactly: `zenith-pdf-documents`
3. Restart backend: Ctrl+C, then `npm run dev`

### Issue: "WebSocket connection failed"

1. Check backend is running on port 3000
2. Check browser console for errors
3. Restart both frontend and backend

### Issue: "Frontend shows blank page"

```bash
# Check browser console (F12)
# Should show no errors

# Clear browser cache (Ctrl+Shift+R)
# Or try incognito mode
```

## Stopping the Application

### Stop Dev Servers

In the terminal where `npm run dev` is running:
```bash
# Press Ctrl+C
```

### Stop Docker Services

```bash
npm run docker:down
```

### Complete Shutdown

```bash
# Stop dev servers: Ctrl+C
# Stop Docker:
npm run docker:down

# Optionally remove data (WARNING: deletes all uploads/documents):
docker volume rm zenith-pdf_postgres_data zenith-pdf_redis_data zenith-pdf_minio_data
```

## Daily Development Workflow

```bash
# 1. Start Docker services (if not running)
npm run docker:up

# 2. Start dev servers
npm run dev

# 3. Open browser
# http://localhost:5173

# 4. Develop! Changes auto-reload

# 5. When done
# Ctrl+C to stop servers
npm run docker:down
```

## Useful Commands

### View Logs

```bash
# Backend logs (already shown in terminal)
# Frontend logs (already shown in terminal)

# PostgreSQL logs
docker logs zenith-postgres -f

# Redis logs
docker logs zenith-redis -f

# MinIO logs
docker logs zenith-minio -f
```

### Access Database

```bash
# PostgreSQL CLI
docker exec -it zenith-postgres psql -U zenith_user -d zenith_pdf

# Common queries:
# \dt                    # List tables
# SELECT * FROM users;   # View users
# \q                     # Quit
```

### Reset Everything

```bash
# Stop everything
npm run docker:down

# Delete all data
docker volume rm zenith-pdf_postgres_data zenith-pdf_redis_data zenith-pdf_minio_data

# Start fresh
npm run docker:up

# Recreate MinIO bucket at http://localhost:9001
# Then restart dev servers
npm run dev
```

## Success Checklist

After launching, you should have:

- ✅ Docker containers running (3)
- ✅ Backend at http://localhost:3000
- ✅ Frontend at http://localhost:5173
- ✅ MinIO console at http://localhost:9001
- ✅ Can login with test user
- ✅ Can upload PDFs
- ✅ Can view document list

## What's Next?

Now that it's running:

1. **Explore the UI** - Upload PDFs, try the interface
2. **Check the code** - See how backend APIs work
3. **Review architecture** - Read [README.md](./README.md)
4. **Start developing** - Pick a feature to implement!

### Features to Implement

The backend is ~95% complete. Focus on frontend:

1. **PDF.js Integration** - Render PDFs in viewer
2. **Annotation UI** - Drawing tools for highlights
3. **Comment Threads** - Discussion interface
4. **Presence Indicators** - Show active users
5. **Export Feature** - Download with annotations

## Need Help?

- Backend not starting? Check [backend/src/index.ts](backend/src/index.ts)
- Frontend issues? Check browser console (F12)
- Docker problems? Check `docker ps` and `docker logs`
- Database issues? See [GETTING_STARTED.md](./GETTING_STARTED.md)

## Quick Reference

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | test@zenith-pdf.com / testpassword123 |
| Backend API | http://localhost:3000 | - |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| PostgreSQL | localhost:5432 | zenith_user / zenith_dev_password |
| Redis | localhost:6379 | (no password) |

**You're all set! Happy coding! 🚀**
