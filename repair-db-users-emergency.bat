@echo off
setlocal EnableExtensions

title Meridian LMS - Emergency Database Credential Repair
cd /d "%~dp0"

echo.
echo ========================================================
echo   Meridian LMS - Emergency database credential repair
echo ========================================================
echo.
echo This will temporarily stop each MySQL container and reset only
echo MySQL user passwords. It will not delete data.
echo.
echo Use this only when repair-db-users.bat reports that root
echo authentication failed for an existing MySQL volume.
echo.

choice /C YN /N /M "This will temporarily stop each MySQL container and reset only MySQL user passwords. It will not delete data. Continue? [Y/N] "
if errorlevel 2 (
    echo.
    echo Cancelled. No change was made.
    pause
    exit /b 0
)

where docker >nul 2>&1
if errorlevel 1 (
    echo [FAILED] Docker CLI was not found in PATH.
    goto :FAIL
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [FAILED] Docker Desktop is not running.
    goto :FAIL
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\repair-db-users-emergency.ps1"
if errorlevel 1 goto :FAIL

echo.
echo [DONE] Emergency database credential repair completed.
echo Double-click start-lms.bat to start or verify the full LMS.
pause
exit /b 0

:FAIL
echo.
echo [FAILED] Emergency database credential repair did not complete.
echo The helper attempted to restart any database container it stopped.
echo No LMS application table or named volume was removed.
pause
exit /b 1
