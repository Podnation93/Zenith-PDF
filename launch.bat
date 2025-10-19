@echo off
echo ========================================
echo   Zenith PDF - Launch Script
echo ========================================
echo.

echo [1/4] Checking Docker...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo ✓ Docker is running

echo.
echo [2/4] Starting Docker services...
echo This will start PostgreSQL, Redis, and MinIO
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start Docker services
    pause
    exit /b 1
)

echo.
echo Waiting for services to initialize (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo [3/4] Checking services...
docker ps

echo.
echo ========================================
echo   Services Started!
echo ========================================
echo.
echo PostgreSQL: localhost:5432
echo Redis:      localhost:6379
echo MinIO:      http://localhost:9001
echo.
echo [4/4] Next Steps:
echo.
echo 1. Setup MinIO bucket:
echo    - Open http://localhost:9001
echo    - Login: minioadmin / minioadmin
echo    - Create bucket: zenith-pdf-documents
echo.
echo 2. Start development servers:
echo    npm run dev
echo.
echo 3. Access application:
echo    http://localhost:5173
echo.
echo ========================================

pause
