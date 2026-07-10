@echo off
setlocal

title LMS Microservices Launcher
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo ==========================================
echo   LMS Microservices Architecture Launcher
echo ==========================================
echo.

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker CLI was not found. Open Docker Desktop first, then run this file again.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js or add it to PATH, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js/npm or add it to PATH, then run this file again.
  pause
  exit /b 1
)

call :load_env_value "%ROOT%api-gateway\.env" "JWT_SECRET"

echo Starting Docker infrastructure...
docker compose -f "%ROOT%infra\docker-compose.yml" up -d
if errorlevel 1 (
  echo Failed to start Docker infrastructure.
  pause
  exit /b 1
)

echo.
echo Applying idempotent User Service migrations when available...
if exist "%ROOT%user-service\src\data\migrateUserStatus.js" (
  pushd "%ROOT%user-service" >nul
  call npm run migrate:user-status
  popd >nul
)

echo.
echo Opening service terminals...
call :start_service "LMS User Service - http://localhost:5001" "user-service" "npm run dev"
call :start_service "LMS Course Service - http://localhost:5002" "course-service" "npm run dev"
call :start_service "LMS API Gateway - http://localhost:3000" "api-gateway" "npm run dev"
call :start_service "LMS Web Client - http://localhost:5173" "web-client" "npm run dev -- --host 0.0.0.0"

echo.
echo Core LMS services are starting.
echo Web Client:  http://localhost:5173
echo API Gateway: http://localhost:3000
echo.
echo Keep the opened service windows running while you use the app.
echo Close those windows to stop the Node/Vite processes.
echo.

start "" "http://localhost:5173"
pause
exit /b 0

:start_service
set "WINDOW_TITLE=%~1"
set "SERVICE_DIR=%~2"
set "SERVICE_COMMAND=%~3"
start "%WINDOW_TITLE%" cmd /k ""cd /d "%ROOT%%SERVICE_DIR%" && %SERVICE_COMMAND%""
exit /b 0

:load_env_value
set "ENV_FILE=%~1"
set "ENV_KEY=%~2"
if not exist "%ENV_FILE%" exit /b 0
for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
  if /i "%%A"=="%ENV_KEY%" set "%ENV_KEY%=%%B"
)
exit /b 0
