@echo off
chcp 65001 >nul 2>&1
title LMS Microservices - One-Click Launcher
color 0A

echo ╔══════════════════════════════════════════════════════════════════╗
echo ║           MERIDIAN LMS - MICROSERVICES LAUNCHER                ║
echo ║     Learning Management System - Full Stack Startup            ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

:: ──────────────────────────────────────────────────────────────
:: STEP 0: Pre-flight checks
:: ──────────────────────────────────────────────────────────────
echo [STEP 0] Pre-flight checks...

where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH.
    echo         Please install Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Please install Node.js: https://nodejs.org/
    pause
    exit /b 1
)

docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker daemon is not running.
    echo         Please start Docker Desktop and wait for it to be ready.
    echo.
    echo         Attempting to start Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>nul
    echo         Waiting 30 seconds for Docker to initialize...
    timeout /t 30 /nobreak >nul
    docker info >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Docker still not ready. Please start Docker Desktop manually and re-run this script.
        pause
        exit /b 1
    )
)

echo [OK] Docker is running.
echo [OK] Node.js is available.
echo.

:: ──────────────────────────────────────────────────────────────
:: STEP 1: Stop any previous containers
:: ──────────────────────────────────────────────────────────────
echo [STEP 1] Stopping any previous LMS containers...
docker compose down --remove-orphans >nul 2>&1
echo [OK] Previous containers cleaned up.
echo.

:: ──────────────────────────────────────────────────────────────
:: STEP 2: Install dependencies for all Node.js services
:: ──────────────────────────────────────────────────────────────
echo [STEP 2] Installing dependencies for all services...
echo.

echo   [2a] Installing API Gateway dependencies...
if not exist "api-gateway\node_modules" (
    cd api-gateway && npm install --silent 2>nul && cd ..
    echo   [OK] API Gateway dependencies installed.
) else (
    echo   [OK] API Gateway dependencies already present.
)

echo   [2b] Installing User Service dependencies...
if not exist "user-service\node_modules" (
    cd user-service && npm install --silent 2>nul && cd ..
    echo   [OK] User Service dependencies installed.
) else (
    echo   [OK] User Service dependencies already present.
)

echo   [2c] Installing Course Service dependencies...
if not exist "course-service\node_modules" (
    cd course-service && npm install --silent 2>nul && cd ..
    echo   [OK] Course Service dependencies installed.
) else (
    echo   [OK] Course Service dependencies already present.
)

echo   [2d] Installing Payment Service dependencies...
if not exist "payment-service\node_modules" (
    cd payment-service && npm install --silent 2>nul && cd ..
    echo   [OK] Payment Service dependencies installed.
) else (
    echo   [OK] Payment Service dependencies already present.
)

echo   [2e] Installing Web Client dependencies...
if not exist "web-client\node_modules" (
    cd web-client && npm install --silent 2>nul && cd ..
    echo   [OK] Web Client dependencies installed.
) else (
    echo   [OK] Web Client dependencies already present.
)

echo.
echo [OK] All dependencies ready.
echo.

:: ──────────────────────────────────────────────────────────────
:: STEP 3: Create .env files if they don't exist
:: ──────────────────────────────────────────────────────────────
echo [STEP 3] Ensuring environment configuration files exist...

if not exist "user-service\.env" (
    echo PORT=5001> user-service\.env
    echo NODE_ENV=development>> user-service\.env
    echo DB_HOST=localhost>> user-service\.env
    echo DB_PORT=3316>> user-service\.env
    echo DB_USER=lms_user_admin>> user-service\.env
    echo DB_PASSWORD=demo_user_db_password_change_me>> user-service\.env
    echo DB_NAME=lms_user_db>> user-service\.env
    echo JWT_SECRET=demo_jwt_secret_change_me_for_local_only>> user-service\.env
    echo BCRYPT_SALT_ROUNDS=12>> user-service\.env
    echo   [OK] Created user-service\.env
) else (
    echo   [OK] user-service\.env already exists.
)

if not exist "course-service\.env" (
    echo PORT=5002> course-service\.env
    echo NODE_ENV=development>> course-service\.env
    echo DB_HOST=localhost>> course-service\.env
    echo DB_PORT=3317>> course-service\.env
    echo DB_USER=lms_course_admin>> course-service\.env
    echo DB_PASSWORD=demo_course_db_password_change_me>> course-service\.env
    echo DB_NAME=lms_course_db>> course-service\.env
    echo JWT_SECRET=demo_jwt_secret_change_me_for_local_only>> course-service\.env
    echo   [OK] Created course-service\.env
) else (
    echo   [OK] course-service\.env already exists.
)

if not exist "payment-service\.env" (
    echo PORT=5004> payment-service\.env
    echo NODE_ENV=development>> payment-service\.env
    echo DB_HOST=localhost>> payment-service\.env
    echo DB_PORT=3309>> payment-service\.env
    echo DB_USER=lms_payment_admin>> payment-service\.env
    echo DB_PASSWORD=demo_payment_db_password_change_me>> payment-service\.env
    echo DB_NAME=lms_payment_db>> payment-service\.env
    echo JWT_SECRET=demo_jwt_secret_change_me_for_local_only>> payment-service\.env
    echo ZALOPAY_APP_ID=2553>> payment-service\.env
    echo ZALOPAY_KEY1=uu459283749823>> payment-service\.env
    echo MOMO_PARTNER_CODE=MOMO_LMS2026>> payment-service\.env
    echo COURSE_SERVICE_URL=http://localhost:5002>> payment-service\.env
    echo   [OK] Created payment-service\.env
) else (
    echo   [OK] payment-service\.env already exists.
)

if not exist "api-gateway\.env" (
    echo PORT=3000> api-gateway\.env
    echo NODE_ENV=development>> api-gateway\.env
    echo USER_SERVICE_URL=http://localhost:5001>> api-gateway\.env
    echo COURSE_SERVICE_URL=http://localhost:5002>> api-gateway\.env
    echo EXAM_SERVICE_URL=http://localhost:5003>> api-gateway\.env
    echo PAYMENT_SERVICE_URL=http://localhost:5004>> api-gateway\.env
    echo JWT_SECRET=demo_jwt_secret_change_me_for_local_only>> api-gateway\.env
    echo WEB_CLIENT_ORIGIN=http://localhost:5173>> api-gateway\.env
    echo   [OK] Created api-gateway\.env
) else (
    echo   [OK] api-gateway\.env already exists.
)

echo.
echo [OK] Environment configuration ready.
echo.

:: ──────────────────────────────────────────────────────────────
:: STEP 4: Start database containers with Docker Compose
:: ──────────────────────────────────────────────────────────────
echo [STEP 4] Starting database containers (MySQL instances)...
docker compose up -d user-db-mysql course-db-mysql exam-db-mysql payment-db-mysql 2>&1
echo.

echo   Waiting for databases to initialize (30 seconds)...
timeout /t 30 /nobreak >nul
echo [OK] Databases should be ready.
echo.

:: ──────────────────────────────────────────────────────────────
:: STEP 5: Start backend microservices
:: ──────────────────────────────────────────────────────────────
echo [STEP 5] Starting backend microservices...
echo.

echo   [5a] Starting User Service on port 5001...
start "LMS - User Service (5001)" /min cmd /c "cd /d %~dp0user-service && node src/server.js 2>&1"
timeout /t 2 /nobreak >nul

echo   [5b] Starting Course Service on port 5002...
start "LMS - Course Service (5002)" /min cmd /c "cd /d %~dp0course-service && node src/server.js 2>&1"
timeout /t 2 /nobreak >nul

echo   [5c] Starting Exam Service on port 5003...
where dotnet >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start "LMS - Exam Service (5003)" /min cmd /c "cd /d %~dp0exam-service && dotnet run --urls=http://localhost:5003 2>&1"
    echo   [OK] Exam Service starting (C#/.NET)...
) else (
    echo   [WARN] .NET SDK not found. Exam Service will not start.
    echo          Install .NET SDK from: https://dotnet.microsoft.com/download
)
timeout /t 2 /nobreak >nul

echo   [5d] Starting Payment Service on port 5004...
start "LMS - Payment Service (5004)" /min cmd /c "cd /d %~dp0payment-service && node index.js 2>&1"
timeout /t 2 /nobreak >nul

echo   [5e] Starting API Gateway on port 3000...
start "LMS - API Gateway (3000)" /min cmd /c "cd /d %~dp0api-gateway && node src/server.js 2>&1"
timeout /t 3 /nobreak >nul

echo.
echo [OK] All backend services started.
echo.

:: ──────────────────────────────────────────────────────────────
:: STEP 6: Start Web Client (React + Vite)
:: ──────────────────────────────────────────────────────────────
echo [STEP 6] Starting Web Client (React/Vite dev server)...
start "LMS - Web Client (5173)" /min cmd /c "cd /d %~dp0web-client && npx vite --host 2>&1"
timeout /t 5 /nobreak >nul
echo [OK] Web Client starting on port 5173.
echo.

:: ──────────────────────────────────────────────────────────────
:: STEP 7: Health check
:: ──────────────────────────────────────────────────────────────
echo [STEP 7] Running quick health checks...
echo.

timeout /t 5 /nobreak >nul

curl -s -o nul -w "  API Gateway (3000):    HTTP %%{http_code}\n" http://localhost:3000/health 2>nul || echo   API Gateway (3000):    Waiting...
curl -s -o nul -w "  User Service (5001):   HTTP %%{http_code}\n" http://localhost:5001/health 2>nul || echo   User Service (5001):   Waiting...
curl -s -o nul -w "  Course Service (5002): HTTP %%{http_code}\n" http://localhost:5002/health 2>nul || echo   Course Service (5002): Waiting...
curl -s -o nul -w "  Payment Service (5004):HTTP %%{http_code}\n" http://localhost:5004/health 2>nul || echo   Payment Service (5004):Waiting...

echo.

:: ──────────────────────────────────────────────────────────────
:: STEP 8: Open browser
:: ──────────────────────────────────────────────────────────────
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                  LMS SYSTEM IS RUNNING!                        ║
echo ╠══════════════════════════════════════════════════════════════════╣
echo ║                                                                ║
echo ║  Web Client:       http://localhost:5173                       ║
echo ║  API Gateway:      http://localhost:3000                       ║
echo ║  User Service:     http://localhost:5001                       ║
echo ║  Course Service:   http://localhost:5002                       ║
echo ║  Exam Service:     http://localhost:5003                       ║
echo ║  Payment Service:  http://localhost:5004                       ║
echo ║                                                                ║
echo ║  Demo Accounts:                                                ║
echo ║    Student:    student@lms.edu    / Lms@2026                   ║
echo ║    Instructor: instructor@lms.edu / Lms@2026                   ║
echo ║    Admin:      admin@lms.edu     / Lms@2026                    ║
echo ║                                                                ║
echo ║  Press any key in THIS window to STOP all services.            ║
echo ║  Keep this window open to keep LMS running.                    ║
echo ║                                                                ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

:: Open the web app in default browser
start "" http://localhost:5173

echo Waiting... Press any key to stop all LMS services.
pause >nul

:: ──────────────────────────────────────────────────────────────
:: CLEANUP: Stop all services
:: ──────────────────────────────────────────────────────────────
echo.
echo [SHUTDOWN] Stopping all LMS services...

:: Kill background processes by window title
taskkill /FI "WINDOWTITLE eq LMS - User Service*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LMS - Course Service*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LMS - Exam Service*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LMS - Payment Service*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LMS - API Gateway*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LMS - Web Client*" /F >nul 2>&1

:: Stop Docker containers
docker compose down >nul 2>&1

echo [OK] All LMS services stopped.
echo.
echo Thank you for using Meridian LMS!
timeout /t 3 /nobreak >nul