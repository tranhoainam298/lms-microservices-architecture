@echo off
chcp 65001 >nul 2>&1
title LMS Microservices - Shutdown
color 0C

echo ╔══════════════════════════════════════════════════════════════════╗
echo ║           MERIDIAN LMS - SHUTDOWN ALL SERVICES                 ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

echo [1/3] Stopping Node.js and .NET services...
taskkill /FI "WINDOWTITLE eq LMS - User Service*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LMS - Course Service*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LMS - Exam Service*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LMS - Payment Service*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LMS - API Gateway*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LMS - Web Client*" /F >nul 2>&1
echo [OK] Application services stopped.

echo [2/3] Stopping Docker containers...
docker compose down --remove-orphans >nul 2>&1
echo [OK] Docker containers stopped.

echo [3/3] Cleanup complete.
echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║              ALL LMS SERVICES HAVE BEEN STOPPED                ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.
timeout /t 3 /nobreak >nul