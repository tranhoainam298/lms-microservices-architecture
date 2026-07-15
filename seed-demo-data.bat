@echo off
setlocal
cd /d "%~dp0"

echo [LMS DEMO] Preparing the local demonstration dataset...

docker --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker is not installed or is not available in PATH.
  pause
  exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker Compose is not available.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\seed-demo-data.ps1"
set "SEED_EXIT=%ERRORLEVEL%"

if not "%SEED_EXIT%"=="0" (
  echo.
  echo [HELP] Start the LMS with start-lms.bat, wait for healthy containers, then retry.
  pause
  exit /b %SEED_EXIT%
)

echo.
echo [SUCCESS] Open http://localhost:8080 and use an account from docs\demo\DEMO_ACCOUNTS.md.
pause
exit /b 0
