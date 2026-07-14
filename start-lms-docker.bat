@echo off
chcp 65001 >nul 2>&1
title LMS Microservices - Full Docker Launcher
color 0B

echo ╔══════════════════════════════════════════════════════════════════╗
echo ║      MERIDIAN LMS - FULL DOCKER COMPOSE LAUNCHER               ║
echo ║   All services run inside Docker containers                    ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

:: Pre-flight
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker daemon is not running. Start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/4] Cleaning up previous containers...
docker compose down --remove-orphans >nul 2>&1
echo [OK] Done.

echo [2/4] Building and starting all containers...
echo      This may take a few minutes on first run.
echo.
docker compose up -d --build 2>&1
echo.

echo [3/4] Waiting for services to become healthy (60 seconds)...
timeout /t 60 /nobreak >nul

echo [4/4] Health checks...
echo.
curl -s -o nul -w "  Nginx LB (8080):       HTTP %%{http_code}\n" http://localhost:8080/health 2>nul || echo   Nginx LB (8080):       Waiting...
curl -s -o nul -w "  API Gateway (3000):    HTTP %%{http_code}\n" http://localhost:3000/health 2>nul || echo   API Gateway (3000):    Waiting...
echo.

echo ╔══════════════════════════════════════════════════════════════════╗
echo ║               LMS SYSTEM IS RUNNING (DOCKER)                   ║
echo ╠══════════════════════════════════════════════════════════════════╣
echo ║                                                                ║
echo ║  Web App (via Nginx): http://localhost:8080                    ║
echo ║  API Gateway:         http://localhost:3000                    ║
echo ║  RabbitMQ Management: http://localhost:15672                   ║
echo ║                                                                ║
echo ║  Demo Accounts:                                                ║
echo ║    Student:    student@lms.edu    / Lms@2026                   ║
echo ║    Instructor: instructor@lms.edu / Lms@2026                   ║
echo ║    Admin:      admin@lms.edu     / Lms@2026                    ║
echo ║                                                                ║
echo ║  Run 'docker compose logs -f' to view logs.                   ║
echo ║  Press any key to STOP all Docker containers.                  ║
echo ║                                                                ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

start "" http://localhost:8080

echo Waiting... Press any key to stop all containers.
pause >nul

echo.
echo [SHUTDOWN] Stopping all Docker containers...
docker compose down
echo [OK] All containers stopped.
timeout /t 3 /nobreak >nul