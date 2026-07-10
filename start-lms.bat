@echo off
setlocal EnableExtensions DisableDelayedExpansion

title LMS Microservices Architecture Launcher
set "ROOT=%~dp0"

cd /d "%ROOT%"
if errorlevel 1 (
    echo [FAILED] Cannot open project directory:
    echo %ROOT%
    goto :FAIL
)

echo.
echo ==========================================
echo   LMS Microservices Architecture Launcher
echo ==========================================
echo.

REM ============================================================
REM 1. CHECK REQUIRED SOFTWARE
REM ============================================================

call :REQUIRE_COMMAND docker "Docker CLI"
if errorlevel 1 goto :FAIL

call :REQUIRE_COMMAND node "Node.js"
if errorlevel 1 goto :FAIL

call :REQUIRE_COMMAND npm "npm"
if errorlevel 1 goto :FAIL

call :REQUIRE_COMMAND dotnet ".NET SDK"
if errorlevel 1 goto :FAIL

call :REQUIRE_COMMAND powershell "PowerShell"
if errorlevel 1 goto :FAIL

REM ============================================================
REM 2. START DOCKER DESKTOP
REM ============================================================

call :ENSURE_DOCKER
if errorlevel 1 goto :FAIL

echo [READY] Docker engine is running.

REM ============================================================
REM 3. LOAD SHARED JWT SECRET
REM ============================================================

if not exist "%ROOT%api-gateway\.env" (
    echo.
    echo [FAILED] Missing file:
    echo %ROOT%api-gateway\.env
    echo.
    echo Create api-gateway\.env from api-gateway\.env.example.
    goto :FAIL
)

set "JWT_SECRET="

for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%ROOT%api-gateway\.env") do (
    if /i "%%A"=="JWT_SECRET" set "JWT_SECRET=%%B"
)

set "JWT_SECRET=%JWT_SECRET:"=%"
set "JWT_SECRET=%JWT_SECRET:'=%"

if not defined JWT_SECRET (
    echo [FAILED] JWT_SECRET was not found in api-gateway\.env.
    goto :FAIL
)

set "COURSE_SERVICE_URL=http://127.0.0.1:5002"
set "ASPNETCORE_URLS=http://127.0.0.1:5003"

REM ============================================================
REM 4. START DOCKER INFRASTRUCTURE
REM ============================================================

echo.
echo Starting Docker infrastructure...

docker compose -f "%ROOT%infra\docker-compose.yml" up -d

if errorlevel 1 (
    echo [FAILED] Docker infrastructure could not be started.
    goto :FAIL
)

echo.
echo Waiting for MySQL containers...

call :WAIT_PORT 3316 90 "User MySQL"
if errorlevel 1 goto :FAIL

call :WAIT_PORT 3317 90 "Course MySQL"
if errorlevel 1 goto :FAIL

call :WAIT_PORT 3308 90 "Exam MySQL"
if errorlevel 1 goto :FAIL

REM ============================================================
REM 5. LOAD EXAM DATABASE CONFIGURATION
REM ============================================================

set "EXAM_DB_NAME="
set "EXAM_DB_USER="
set "EXAM_DB_PASSWORD="
set "EXAM_DB_ROOT_PASSWORD="
set "EXAM_DB_PORT="

for /f "tokens=1,* delims==" %%A in ('docker inspect --format "{{range .Config.Env}}{{println .}}{{end}}" exam-db-mysql 2^>nul') do (
    if /i "%%A"=="MYSQL_DATABASE" set "EXAM_DB_NAME=%%B"
    if /i "%%A"=="MYSQL_USER" set "EXAM_DB_USER=%%B"
    if /i "%%A"=="MYSQL_PASSWORD" set "EXAM_DB_PASSWORD=%%B"
    if /i "%%A"=="MYSQL_ROOT_PASSWORD" set "EXAM_DB_ROOT_PASSWORD=%%B"
)

for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$lines = @(& docker port exam-db-mysql 3306/tcp); if ($lines.Count -gt 0) { ($lines[0] -split ':')[-1] }"`) do (
    set "EXAM_DB_PORT=%%P"
)

if not defined EXAM_DB_USER set "EXAM_DB_USER=root"
if not defined EXAM_DB_PASSWORD set "EXAM_DB_PASSWORD=%EXAM_DB_ROOT_PASSWORD%"
if not defined EXAM_DB_PORT set "EXAM_DB_PORT=3308"

if not defined EXAM_DB_NAME (
    echo [FAILED] Could not read Exam database name.
    goto :FAIL
)

if not defined EXAM_DB_PASSWORD (
    echo [FAILED] Could not read Exam database password.
    goto :FAIL
)

set "ConnectionStrings__DefaultConnection=Server=127.0.0.1;Port=%EXAM_DB_PORT%;Database=%EXAM_DB_NAME%;User=%EXAM_DB_USER%;Password=%EXAM_DB_PASSWORD%;"

REM ============================================================
REM 6. CHECK PROJECT DIRECTORIES
REM ============================================================

call :REQUIRE_DIRECTORY "user-service"
if errorlevel 1 goto :FAIL

call :REQUIRE_DIRECTORY "course-service"
if errorlevel 1 goto :FAIL

call :REQUIRE_DIRECTORY "exam-service"
if errorlevel 1 goto :FAIL

call :REQUIRE_DIRECTORY "api-gateway"
if errorlevel 1 goto :FAIL

call :REQUIRE_DIRECTORY "web-client"
if errorlevel 1 goto :FAIL

REM ============================================================
REM 7. INSTALL NODE DEPENDENCIES WHEN MISSING
REM ============================================================

echo.
echo Checking Node.js dependencies...

call :ENSURE_NODE_MODULES "user-service" "User Service"
if errorlevel 1 goto :FAIL

call :ENSURE_NODE_MODULES "course-service" "Course Service"
if errorlevel 1 goto :FAIL

call :ENSURE_NODE_MODULES "api-gateway" "API Gateway"
if errorlevel 1 goto :FAIL

call :ENSURE_NODE_MODULES "web-client" "Web Client"
if errorlevel 1 goto :FAIL

echo [READY] Node.js dependencies are available.

REM ============================================================
REM 8. VERIFY NPM SCRIPTS
REM ============================================================

pushd "%ROOT%user-service" >nul
node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts.dev?0:1)"
if errorlevel 1 (
    popd >nul
    echo [FAILED] user-service package.json has no dev script.
    goto :FAIL
)
popd >nul

pushd "%ROOT%course-service" >nul
node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts.dev?0:1)"
if errorlevel 1 (
    popd >nul
    echo [FAILED] course-service package.json has no dev script.
    goto :FAIL
)
popd >nul

pushd "%ROOT%api-gateway" >nul
node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts.dev?0:1)"
if errorlevel 1 (
    popd >nul
    echo [FAILED] api-gateway package.json has no dev script.
    goto :FAIL
)
popd >nul

pushd "%ROOT%web-client" >nul
node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts.dev?0:1)"
if errorlevel 1 (
    popd >nul
    echo [FAILED] web-client package.json has no dev script.
    echo Run npm run inside web-client to inspect available scripts.
    goto :FAIL
)
popd >nul

REM ============================================================
REM 9. RUN USER SERVICE MIGRATIONS
REM ============================================================

echo.
echo Applying idempotent User Service migrations...

pushd "%ROOT%user-service" >nul

if exist "%ROOT%user-service\src\data\migrateLoginAudit.js" (
    call npm run migrate:login-audit

    if errorlevel 1 (
        popd >nul
        echo [FAILED] Login audit migration failed.
        goto :FAIL
    )
)

if exist "%ROOT%user-service\src\data\migrateUserStatus.js" (
    call npm run migrate:user-status

    if errorlevel 1 (
        popd >nul
        echo [FAILED] User status migration failed.
        goto :FAIL
    )
)

popd >nul

echo [READY] User Service migrations completed.

REM ============================================================
REM 10. BUILD EXAM SERVICE WHEN NEEDED
REM ============================================================

call :IS_PORT_OPEN 5003

if errorlevel 1 (
    echo.
    echo Restoring and building Exam Service...

    dotnet restore "%ROOT%exam-service\ExamService.csproj" --nologo

    if errorlevel 1 (
        echo [FAILED] Exam Service restore failed.
        goto :FAIL
    )

    dotnet build "%ROOT%exam-service\ExamService.csproj" --nologo --no-restore

    if errorlevel 1 (
        echo [FAILED] Exam Service build failed.
        goto :FAIL
    )

    echo [READY] Exam Service build completed.
) else (
    echo [SKIP] Exam Service is already listening on port 5003.
)

REM ============================================================
REM 11. START BACKEND SERVICES
REM ============================================================

echo.
echo Starting backend services...

call :START_SERVICE 5001 "LMS User Service" "user-service" "call npm run dev"
if errorlevel 1 goto :FAIL

call :START_SERVICE 5002 "LMS Course Service" "course-service" "call npm run dev"
if errorlevel 1 goto :FAIL

call :START_SERVICE 5003 "LMS Exam Service" "exam-service" "dotnet run --no-build"
if errorlevel 1 goto :FAIL

call :START_SERVICE 3000 "LMS API Gateway" "api-gateway" "call npm run dev"
if errorlevel 1 goto :FAIL

REM ============================================================
REM 12. VERIFY BACKEND PORTS
REM ============================================================

echo.
echo Waiting for backend services...

call :WAIT_PORT 5001 60 "User Service"
if errorlevel 1 goto :FAIL

call :WAIT_PORT 5002 60 "Course Service"
if errorlevel 1 goto :FAIL

call :WAIT_PORT 5003 60 "Exam Service"
if errorlevel 1 goto :FAIL

call :WAIT_PORT 3000 60 "API Gateway"
if errorlevel 1 goto :FAIL

REM ============================================================
REM 13. START OR RESTART WEB CLIENT
REM ============================================================

echo.
echo Checking Web Client HTTP response...

call :IS_WEB_HEALTHY

if not errorlevel 1 (
    echo [READY] Web Client is already responding at:
    echo         http://127.0.0.1:5173
    goto :WEB_READY
)

echo Web Client is not responding correctly.

call :IS_PORT_OPEN 5173

if not errorlevel 1 (
    echo Stopping stale process on port 5173...
    call :KILL_PORT 5173

    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 2"
)

echo Starting Web Client from:
echo %ROOT%web-client

start "LMS Web Client - http://127.0.0.1:5173" /D "%ROOT%web-client" cmd.exe /k "call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"

if errorlevel 1 (
    echo [FAILED] Could not open the Web Client command window.
    goto :FAIL
)

echo Waiting for the Web Client HTTP server...

call :WAIT_WEB_HTTP 90

if errorlevel 1 (
    echo.
    echo [FAILED] Web Client did not respond at:
    echo http://127.0.0.1:5173
    echo.
    echo Read the error inside the LMS Web Client command window.
    goto :FAIL
)

:WEB_READY

REM ============================================================
REM 14. OPEN WEBSITE
REM ============================================================

echo.
echo ==========================================
echo   LMS IS READY
echo ==========================================
echo.
echo Web Client:     http://127.0.0.1:5173
echo API Gateway:    http://127.0.0.1:3000
echo User Service:   http://127.0.0.1:5001
echo Course Service: http://127.0.0.1:5002
echo Exam Service:   http://127.0.0.1:5003
echo.
echo Opening LMS in the default browser...

start "" "http://127.0.0.1:5173/"

echo.
echo Keep the backend and Web Client windows open while using LMS.
echo.

pause
exit /b 0

REM ============================================================
REM SUBROUTINES
REM ============================================================

:REQUIRE_COMMAND
where %~1 >nul 2>&1

if errorlevel 1 (
    echo [FAILED] %~2 was not found in PATH.
    exit /b 1
)

exit /b 0


:REQUIRE_DIRECTORY
if not exist "%ROOT%%~1\" (
    echo [FAILED] Missing project directory:
    echo %ROOT%%~1
    exit /b 1
)

exit /b 0


:ENSURE_DOCKER
docker info >nul 2>&1

if not errorlevel 1 exit /b 0

echo Docker engine is not running.
echo Starting Docker Desktop...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$dockerPath = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe';" ^
    "if (Test-Path -LiteralPath $dockerPath) {" ^
    "    Start-Process -FilePath $dockerPath;" ^
    "    exit 0" ^
    "};" ^
    "exit 1"

if errorlevel 1 (
    echo [FAILED] Docker Desktop could not be found.
    exit /b 1
)

echo Waiting for Docker engine...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$deadline = (Get-Date).AddMinutes(3);" ^
    "do {" ^
    "    docker info *> $null;" ^
    "    if ($LASTEXITCODE -eq 0) { exit 0 };" ^
    "    Start-Sleep -Seconds 2" ^
    "} while ((Get-Date) -lt $deadline);" ^
    "exit 1"

if errorlevel 1 (
    echo [FAILED] Docker engine did not become ready.
    exit /b 1
)

exit /b 0


:ENSURE_NODE_MODULES
if exist "%ROOT%%~1\node_modules\" exit /b 0

echo Installing %~2 dependencies...

pushd "%ROOT%%~1" >nul

call npm install --no-audit --no-fund

if errorlevel 1 (
    popd >nul
    echo [FAILED] %~2 dependency installation failed.
    exit /b 1
)

popd >nul
exit /b 0


:IS_PORT_OPEN
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$client = New-Object System.Net.Sockets.TcpClient;" ^
    "try {" ^
    "    $client.Connect('127.0.0.1', %~1);" ^
    "    exit 0" ^
    "} catch {" ^
    "    exit 1" ^
    "} finally {" ^
    "    $client.Dispose()" ^
    "}" >nul 2>&1

exit /b %errorlevel%


:WAIT_PORT
set "WAIT_PORT_NUMBER=%~1"
set "WAIT_SECONDS=%~2"
set "WAIT_NAME=%~3"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$deadline = (Get-Date).AddSeconds(%WAIT_SECONDS%);" ^
    "do {" ^
    "    $client = New-Object System.Net.Sockets.TcpClient;" ^
    "    try {" ^
    "        $client.Connect('127.0.0.1', %WAIT_PORT_NUMBER%);" ^
    "        exit 0" ^
    "    } catch {" ^
    "        Start-Sleep -Milliseconds 500" ^
    "    } finally {" ^
    "        $client.Dispose()" ^
    "    }" ^
    "} while ((Get-Date) -lt $deadline);" ^
    "exit 1" >nul 2>&1

if errorlevel 1 (
    echo [FAILED] %WAIT_NAME% did not open port %WAIT_PORT_NUMBER%.
    exit /b 1
)

echo [READY] %WAIT_NAME% on port %WAIT_PORT_NUMBER%.
exit /b 0


:START_SERVICE
set "SERVICE_PORT=%~1"
set "SERVICE_NAME=%~2"
set "SERVICE_DIRECTORY=%~3"
set "SERVICE_COMMAND=%~4"

call :IS_PORT_OPEN %SERVICE_PORT%

if not errorlevel 1 (
    echo [SKIP] %SERVICE_NAME% is already running on port %SERVICE_PORT%.
    exit /b 0
)

if not exist "%ROOT%%SERVICE_DIRECTORY%\" (
    echo [FAILED] Missing service directory:
    echo %ROOT%%SERVICE_DIRECTORY%
    exit /b 1
)

start "%SERVICE_NAME% - http://127.0.0.1:%SERVICE_PORT%" /D "%ROOT%%SERVICE_DIRECTORY%" cmd.exe /k "%SERVICE_COMMAND%"

if errorlevel 1 (
    echo [FAILED] Could not start %SERVICE_NAME%.
    exit /b 1
)

echo [START] %SERVICE_NAME%
exit /b 0


:IS_WEB_HEALTHY
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try {" ^
    "    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 3;" ^
    "    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {" ^
    "        exit 0" ^
    "    }" ^
    "} catch {};" ^
    "exit 1" >nul 2>&1

exit /b %errorlevel%


:WAIT_WEB_HTTP
set "WEB_WAIT_SECONDS=%~1"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$deadline = (Get-Date).AddSeconds(%WEB_WAIT_SECONDS%);" ^
    "do {" ^
    "    try {" ^
    "        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 3;" ^
    "        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {" ^
    "            exit 0" ^
    "        }" ^
    "    } catch {};" ^
    "    Start-Sleep -Milliseconds 750" ^
    "} while ((Get-Date) -lt $deadline);" ^
    "exit 1" >nul 2>&1

if errorlevel 1 exit /b 1

echo [READY] Web Client HTTP server on port 5173.
exit /b 0


:KILL_PORT
set "PORT_TO_KILL=%~1"

for /f "delims=" %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort %PORT_TO_KILL% -State Listen -ErrorAction SilentlyContinue ^| Select-Object -ExpandProperty OwningProcess -Unique"') do (
    echo Stopping process %%P...
    taskkill /PID %%P /F >nul 2>&1
)

exit /b 0


:FAIL
echo.
echo ==========================================
echo   LMS STARTUP FAILED
echo ==========================================
echo.
echo No database volume or database row was deleted.
echo Review the error above and any service window that was opened.
echo.

pause
exit /b 1