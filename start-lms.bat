@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Meridian LMS - Docker Launcher
cd /d "%~dp0"

echo.
echo ==============================================
echo   Meridian LMS - Docker one-click startup
echo ==============================================
echo.

if not exist "docker-compose.yml" (
    echo [FAILED] docker-compose.yml was not found beside this script.
    goto :FAIL
)

where docker >nul 2>&1
if errorlevel 1 (
    echo [FAILED] Docker CLI was not found in PATH.
    echo Install Docker Desktop, then run this launcher again.
    goto :FAIL
)

docker --version
if errorlevel 1 goto :FAIL

docker compose version
if errorlevel 1 (
    echo [FAILED] Docker Compose is not available.
    goto :FAIL
)

call :ENSURE_DOCKER
if errorlevel 1 goto :FAIL

echo.
echo [START] Building and starting the LMS containers...
docker compose up -d --build
if errorlevel 1 (
    echo [FAILED] Docker Compose could not start the LMS stack.
    call :PRINT_DB_HELP_IF_NEEDED
    docker compose ps
    goto :FAIL
)

echo.
echo [WAIT] Waiting for databases, messaging, services, and the web entry point...

call :WAIT_HEALTH "user-db-mysql" 240
if errorlevel 1 goto :HEALTH_FAIL
call :WAIT_HEALTH "course-db-mysql" 240
if errorlevel 1 goto :HEALTH_FAIL
call :WAIT_HEALTH "exam-db-mysql" 240
if errorlevel 1 goto :HEALTH_FAIL
call :WAIT_HEALTH "payment-db-mysql" 240
if errorlevel 1 goto :HEALTH_FAIL
call :WAIT_HEALTH "lms-rabbitmq" 240
if errorlevel 1 goto :HEALTH_FAIL
call :WAIT_HEALTH "external-ai-chatbot-mock" 240
if errorlevel 1 goto :HEALTH_FAIL
call :WAIT_HEALTH "external-payment-gateway-mock" 240
if errorlevel 1 goto :HEALTH_FAIL
call :WAIT_HEALTH "user-service" 240
if errorlevel 1 goto :HEALTH_FAIL
call :WAIT_HEALTH "course-service" 240
if errorlevel 1 goto :HEALTH_FAIL
call :WAIT_HEALTH "exam-service" 240
if errorlevel 1 goto :HEALTH_FAIL
call :WAIT_HEALTH "payment-service" 240
if errorlevel 1 goto :HEALTH_FAIL
call :WAIT_HEALTH "api-gateway" 240
if errorlevel 1 goto :HEALTH_FAIL
call :WAIT_HEALTH "web-client" 240
if errorlevel 1 goto :HEALTH_FAIL
call :WAIT_HEALTH "nginx-load-balancer" 240
if errorlevel 1 goto :HEALTH_FAIL

echo.
echo [CHECK] Verifying http://localhost:8080/health ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8080/health' -TimeoutSec 10; Write-Host $response.Content; if ($response.StatusCode -eq 200) { exit 0 }; exit 1 } catch { exit 1 }"
if errorlevel 1 (
    echo [FAILED] The public LMS health endpoint did not respond successfully.
    docker compose ps
    goto :FAIL
)

echo.
echo ==============================================
echo   LMS IS READY
echo ==============================================
echo.
echo Open: http://localhost:8080
echo.
echo Live ZaloPay requires these values in .env:
echo   ZALOPAY_APP_ID, ZALOPAY_KEY1, ZALOPAY_KEY2
echo Live AI support requires this value in .env:
echo   AI_API_KEY
echo Missing provider credentials do not stop the LMS; only the related live feature is unavailable.
echo.
echo Opening the LMS in your default browser...
start "" "http://localhost:8080"
echo.
echo You may close this window after reviewing the status above.
pause
exit /b 0

:HEALTH_FAIL
echo.
echo [FAILED] One or more LMS containers did not become healthy.
call :PRINT_DB_HELP_IF_NEEDED
docker compose ps
goto :FAIL

:ENSURE_DOCKER
docker info >nul 2>&1
if not errorlevel 1 (
    echo [READY] Docker engine is running.
    exit /b 0
)

echo [INFO] Docker engine is not ready. Attempting to start Docker Desktop...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$path = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'; if (Test-Path -LiteralPath $path) { Start-Process -FilePath $path; exit 0 }; exit 1"
if errorlevel 1 (
    echo [FAILED] Docker Desktop could not be started automatically.
    echo Open Docker Desktop manually, wait until it is ready, then retry.
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddMinutes(3); do { docker info *> $null; if ($LASTEXITCODE -eq 0) { exit 0 }; Start-Sleep -Seconds 2 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
    echo [FAILED] Docker engine did not become ready within three minutes.
    exit /b 1
)

echo [READY] Docker engine is running.
exit /b 0

:WAIT_HEALTH
set "WAIT_CONTAINER=%~1"
set /a WAIT_LIMIT=%~2
set /a WAIT_ELAPSED=0

:WAIT_HEALTH_LOOP
set "WAIT_STATE="
for /f "usebackq delims=" %%S in (`docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" "%WAIT_CONTAINER%" 2^>nul`) do set "WAIT_STATE=%%S"

if /i "!WAIT_STATE!"=="healthy" (
    echo [READY] %WAIT_CONTAINER%
    exit /b 0
)

if /i "!WAIT_STATE!"=="unhealthy" (
    echo [FAILED] %WAIT_CONTAINER% reported unhealthy.
    docker logs --tail 40 "%WAIT_CONTAINER%"
    exit /b 1
)

if !WAIT_ELAPSED! GEQ !WAIT_LIMIT! (
    echo [FAILED] Timed out waiting for %WAIT_CONTAINER%. Last state: !WAIT_STATE!
    docker logs --tail 40 "%WAIT_CONTAINER%"
    exit /b 1
)

if !WAIT_ELAPSED! EQU 0 echo [WAIT] %WAIT_CONTAINER%
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 2" >nul
set /a WAIT_ELAPSED+=2
goto :WAIT_HEALTH_LOOP

:PRINT_DB_HELP_IF_NEEDED
docker compose logs --no-color --tail=80 user-service course-service exam-service payment-service 2>nul | findstr /i /c:"Access denied for user" >nul
if not errorlevel 1 (
    echo.
    echo [HELP] A service reported a MySQL application-user credential mismatch.
    echo 1. Close this launcher and run repair-db-users.bat first.
    echo 2. If root authentication fails, run repair-db-users-emergency.bat.
    echo 3. Neither repair script deletes LMS application data.
)
exit /b 0

:FAIL
echo.
echo LMS startup did not complete. Existing Docker data was left in place.
echo Review the messages above, then press any key to close.
pause
exit /b 1
