@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [INFO] start-lms-docker.bat is kept for compatibility.
echo [INFO] Starting the canonical Docker launcher: start-lms.bat
echo.

call "%~dp0start-lms.bat"
exit /b %ERRORLEVEL%
