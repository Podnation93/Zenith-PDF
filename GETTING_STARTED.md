# Getting Started with Zenith PDF

This guide will walk you through setting up and running Zenith PDF v2.0 on your local machine.

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

This installs dependencies for both backend and frontend workspaces.

### 2. Start Docker Services

```bash
npm run docker:up
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **MinIO** (S3-compatible storage) on ports 9000 (API) and 9001 (Console)

### 3. Create MinIO Bucket

1. Open http://localhost:9001 in your browser
2. Login:
   - **Username**: `minioadmin`
   - **Password**: `minioadmin`
3. Click "Buckets" → "Create Bucket"
4. Enter bucket name: `zenith-pdf-documents`
5. Click "Create Bucket"
6. (Optional) Set bucket to public for easier development:
   - Click on the bucket
   - Go to "Access" tab
   - Set policy to "Public"

### 4. Start Development Servers

```bash
npm run dev
```

This starts:
- **Backend** at http://localhost:3000
- **Frontend** at http://localhost:5173

### 5. Access the Application

Open http://localhost:5173 in your browser.

You can:
- **Register** a new account, or
- **Login** with the test user:
  - Email: `test@zenith-pdf.com`
  - Password: `testpassword123`

## Detailed Setup

### Prerequisites

Ensure you have these installed:

1. **Node.js** (v20 or higher)
   ```bash
   node --version  # Should be >= 20.0.0
   ```

2. **npm** (v10 or higher)
   ```bash
   npm --version   # Should be >= 10.0.0
   ```

3. **Docker Desktop**
   ```bash
   docker --version
   docker-compose --version
   ```

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies** (if not already done)
   ```bash
   npm install
   ```

3. **Configure environment**
   The `.env` file is already created. Review and modify if needed:
   ```bash
   # Key settings:
   DATABASE_URL=postgresql://zenith_user:zenith_dev_password@localhost:5432/zenith_pdf
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-32chars-minimum
   S3_BUCKET=zenith-pdf-documents
   ```

4. **Start backend only**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies** (if not already done)
   ```bash
   npm install
   ```

3. **Start frontend only**
   ```bash
   npm run dev
   ```

## Verification

### 1. Check Backend Health

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

### 2. Check Database Connection

```bash
docker exec -it zenith-postgres psql -U zenith_user -d zenith_pdf -c "SELECT COUNT(*) FROM users;"
```

Expected: Shows count of users (at least 1 for test user).

### 3. Check Redis

```bash
docker exec -it zenith-redis redis-cli PING
```

Expected: `PONG`

### 4. Check MinIO

Open http://localhost:9001 and verify you can login.

### 5. Check Frontend

Open http://localhost:5173 and verify:
- Login page loads
- Can register/login
- No console errors

## Common Issues

### Issue: Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using the port
npx kill-port 3000

# Or change the port in backend/.env
PORT=3001
```

### Issue: Docker Services Won't Start

**Problem**: PostgreSQL or Redis container fails to start

**Solution**:
```bash
# Stop all containers
npm run docker:down

# Remove volumes (WARNING: This deletes all data)
docker volume rm zenith-pdf_postgres_data zenith-pdf_redis_data zenith-pdf_minio_data

# Start fresh
npm run docker:up
```

### Issue: Database Connection Failed

**Problem**: Backend can't connect to PostgreSQL

**Solution**:
1. Verify PostgreSQL is running:
   ```bash
   docker ps | grep postgres
   ```

2. Check database logs:
   ```bash
   docker logs zenith-postgres
   ```

3. Verify connection string in `backend/.env`

### Issue: MinIO Bucket Not Found

**Problem**: Upload fails with "Bucket not found"

**Solution**:
1. Ensure bucket `zenith-pdf-documents` exists in MinIO console
2. Verify `S3_BUCKET` in `backend/.env` matches bucket name
3. Restart backend after creating bucket

### Issue: WebSocket Connection Failed

**Problem**: Real-time features don't work

**Solution**:
1. Check browser console for WebSocket errors
2. Verify backend is running on port 3000
3. Check CORS settings in `backend/.env`
4. Restart both backend and frontend

### Issue: Frontend Can't Reach Backend

**Problem**: API calls return network errors

**Solution**:
1. Verify backend is running: http://localhost:3000/health
2. Check Vite proxy configuration in `frontend/vite.config.ts`
3. Clear browser cache and hard reload

## Development Workflow

### Making Changes

1. **Backend changes**: Hot reload is enabled via `tsx watch`
2. **Frontend changes**: Vite HMR (Hot Module Replacement) updates automatically
3. **Database changes**: Modify `backend/database/init.sql` and recreate database

### Running Tests

```bash
# Backend tests
npm run test --workspace=backend

# Frontend tests
npm run test --workspace=frontend

# All tests
npm test
```

### Code Quality

```bash
# Lint all code
npm run lint

# Type check
cd backend && npm run type-check
cd frontend && npm run type-check
```

### Building for Production

```bash
# Build backend
npm run build --workspace=backend

# Build frontend
npm run build --workspace=frontend

# Build both
npm run build
```

## Database Management

### Access PostgreSQL CLI

```bash
docker exec -it zenith-postgres psql -U zenith_user -d zenith_pdf
```

Useful commands:
```sql
-- List tables
\dt

-- Describe table
\d users

-- Query users
SELECT * FROM users;

-- Quit
\q
```

### Reset Database

**WARNING**: This deletes ALL data!

```bash
# Stop Docker services
npm run docker:down

# Remove PostgreSQL volume
docker volume rm zenith-pdf_postgres_data

# Restart (will reinitialize schema)
npm run docker:up
```

### Backup Database

```bash
docker exec -it zenith-postgres pg_dump -U zenith_user zenith_pdf > backup.sql
```

### Restore Database

```bash
docker exec -i zenith-postgres psql -U zenith_user zenith_pdf < backup.sql
```

## Next Steps

Now that you have Zenith PDF running:

1. **Explore the UI**: Upload a PDF and try the annotation tools
2. **Test Collaboration**: Open the same document in two browser windows
3. **Review the Code**: Check out the architecture in the README
4. **Start Development**: Pick a feature from the roadmap to implement

## Need Help?

- Check the main [README.md](./README.md) for architecture details
- Review the [Technical Specification](./TECHNICAL_SPEC.md)
- Open an issue on GitHub
- Join our community discussions

## What's Next?

- [ ] Implement PDF.js rendering
- [ ] Add annotation drawing tools
- [ ] Improve real-time presence indicators
- [ ] Add comment threading UI
- [ ] Implement PDF export with flattened annotations

Happy coding! 🚀
