@echo off
setlocal EnableExtensions

title Meridian LMS - Database User Repair
cd /d "%~dp0"

echo.
echo ==============================================
echo   Meridian LMS - Database user repair
echo ==============================================
echo.
echo This will update MySQL application user passwords to match the
echo current Docker container environment. It will not delete data.
echo.
echo The helper is limited to ALTER USER and FLUSH PRIVILEGES for:
echo   lms_user_admin, lms_course_admin, lms_exam_admin, lms_payment_admin
echo.

choice /C YN /N /M "Continue? [Y/N] "
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

docker compose up -d user-db-mysql course-db-mysql exam-db-mysql payment-db-mysql
if errorlevel 1 goto :FAIL

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\repair-db-users.ps1"
if errorlevel 1 goto :FAIL

echo.
echo [DONE] Application-user credentials are aligned.
echo You can now double-click start-lms.bat.
pause
exit /b 0

:FAIL
echo.
echo [FAILED] Database user repair did not complete.
echo No application data or schema was removed.
echo Root authentication failed for an existing MySQL volume.
echo Run repair-db-users-emergency.bat to reset MySQL credentials without deleting data.
pause
exit /b 1
