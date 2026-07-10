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
REM 1. CHECK REQUIRED COMMANDS
REM ============================================================

where docker >nul 2>&1
if errorlevel 1 (
    echo [FAILED] Docker CLI was not found.
    echo Install Docker Desktop and ensure docker is available in PATH.
    goto :FAIL
)

where node >nul 2>&1
if errorlevel 1 (
    echo [FAILED] Node.js was not found.
    echo Install Node.js and reopen this launcher.
    goto :FAIL
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [FAILED] npm was not found.
    echo Install Node.js and reopen this launcher.
    goto :FAIL
)

where dotnet >nul 2>&1
if errorlevel 1 (
    echo [FAILED] .NET SDK was not found.
    echo Install the required .NET SDK and reopen this launcher.
    goto :FAIL
)

where powershell >nul 2>&1
if errorlevel 1 (
    echo [FAILED] PowerShell was not found.
    goto :FAIL
)

REM ============================================================
REM 2. START DOCKER DESKTOP WHEN NECESSARY
REM ============================================================

docker info >nul 2>&1

if errorlevel 1 (
    echo Docker engine is not running.
    echo Starting Docker Desktop...

    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$dockerPath = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe';" ^
        "if (Test-Path -LiteralPath $dockerPath) {" ^
        "    Start-Process -FilePath $dockerPath;" ^
        "    exit 0" ^
        "} else {" ^
        "    exit 1" ^
        "}"

    if errorlevel 1 (
        echo [FAILED] Docker Desktop could not be found.
        echo Start Docker Desktop manually and run this file again.
        goto :FAIL
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
        echo [FAILED] Docker engine did not become ready within 3 minutes.
        goto :FAIL
    )
)

echo [READY] Docker engine is running.

REM ============================================================
REM 3. LOAD SHARED JWT SECRET
REM ============================================================

if not exist "%ROOT%api-gateway\.env" (
    echo.
    echo [FAILED] Missing file:
    echo %ROOT%api-gateway\.env
    echo.
    echo Copy api-gateway\.env.example to api-gateway\.env
    echo and configure JWT_SECRET.
    goto :FAIL
)

set "JWT_SECRET="

for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%ROOT%api-gateway\.env") do (
    if /i "%%A"=="JWT_SECRET" set "JWT_SECRET=%%B"
)

REM Remove outer quote characters when present.
set "JWT_SECRET=%JWT_SECRET:"=%"
set "JWT_SECRET=%JWT_SECRET:'=%"

if not defined JWT_SECRET (
    echo [FAILED] JWT_SECRET was not found in api-gateway\.env.
    goto :FAIL
)

REM Child service windows inherit these variables.
set "COURSE_SERVICE_URL=http://localhost:5002"
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

REM User MySQL - port 3316
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$deadline = (Get-Date).AddSeconds(90);" ^
    "do {" ^
    "    $client = New-Object System.Net.Sockets.TcpClient;" ^
    "    try {" ^
    "        $client.Connect('127.0.0.1', 3316);" ^
    "        exit 0" ^
    "    } catch {" ^
    "        Start-Sleep -Milliseconds 500" ^
    "    } finally {" ^
    "        $client.Dispose()" ^
    "    }" ^
    "} while ((Get-Date) -lt $deadline);" ^
    "exit 1" >nul 2>&1

if errorlevel 1 (
    echo [FAILED] User MySQL did not open port 3316.
    goto :FAIL
)

echo [READY] User MySQL on port 3316.

REM Course MySQL - port 3317
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$deadline = (Get-Date).AddSeconds(90);" ^
    "do {" ^
    "    $client = New-Object System.Net.Sockets.TcpClient;" ^
    "    try {" ^
    "        $client.Connect('127.0.0.1', 3317);" ^
    "        exit 0" ^
    "    } catch {" ^
    "        Start-Sleep -Milliseconds 500" ^
    "    } finally {" ^
    "        $client.Dispose()" ^
    "    }" ^
    "} while ((Get-Date) -lt $deadline);" ^
    "exit 1" >nul 2>&1

if errorlevel 1 (
    echo [FAILED] Course MySQL did not open port 3317.
    goto :FAIL
)

echo [READY] Course MySQL on port 3317.

REM Exam MySQL - port 3308
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$deadline = (Get-Date).AddSeconds(90);" ^
    "do {" ^
    "    $client = New-Object System.Net.Sockets.TcpClient;" ^
    "    try {" ^
    "        $client.Connect('127.0.0.1', 3308);" ^
    "        exit 0" ^
    "    } catch {" ^
    "        Start-Sleep -Milliseconds 500" ^
    "    } finally {" ^
    "        $client.Dispose()" ^
    "    }" ^
    "} while ((Get-Date) -lt $deadline);" ^
    "exit 1" >nul 2>&1

if errorlevel 1 (
    echo [FAILED] Exam MySQL did not open port 3308.
    goto :FAIL
)

echo [READY] Exam MySQL on port 3308.

REM ============================================================
REM 5. LOAD EXAM DATABASE CONFIGURATION FROM CONTAINER
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
    echo [FAILED] Could not read MYSQL_DATABASE from exam-db-mysql.
    goto :FAIL
)

if not defined EXAM_DB_PASSWORD (
    echo [FAILED] Could not read the Exam MySQL password.
    goto :FAIL
)

set "ConnectionStrings__DefaultConnection=Server=127.0.0.1;Port=%EXAM_DB_PORT%;Database=%EXAM_DB_NAME%;User=%EXAM_DB_USER%;Password=%EXAM_DB_PASSWORD%;"

REM ============================================================
REM 6. INSTALL NODE DEPENDENCIES WHEN MISSING
REM ============================================================

echo.
echo Checking Node.js dependencies...

if not exist "%ROOT%user-service\node_modules" (
    echo Installing User Service dependencies...

    pushd "%ROOT%user-service" >nul
    call npm install --no-audit --no-fund

    if errorlevel 1 (
        popd >nul
        echo [FAILED] User Service dependency installation failed.
        goto :FAIL
    )

    popd >nul
)

if not exist "%ROOT%course-service\node_modules" (
    echo Installing Course Service dependencies...

    pushd "%ROOT%course-service" >nul
    call npm install --no-audit --no-fund

    if errorlevel 1 (
        popd >nul
        echo [FAILED] Course Service dependency installation failed.
        goto :FAIL
    )

    popd >nul
)

if not exist "%ROOT%api-gateway\node_modules" (
    echo Installing API Gateway dependencies...

    pushd "%ROOT%api-gateway" >nul
    call npm install --no-audit --no-fund

    if errorlevel 1 (
        popd >nul
        echo [FAILED] API Gateway dependency installation failed.
        goto :FAIL
    )

    popd >nul
)

if not exist "%ROOT%web-client\node_modules" (
    echo Installing Web Client dependencies...

    pushd "%ROOT%web-client" >nul
    call npm install --no-audit --no-fund

    if errorlevel 1 (
        popd >nul
        echo [FAILED] Web Client dependency installation failed.
        goto :FAIL
    )

    popd >nul
)

echo [READY] Node.js dependencies are available.

REM ============================================================
REM 7. RUN IDEMPOTENT USER SERVICE MIGRATIONS
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

if exist "%ROOT%user-service\src\data\migrateUserEmailUnique.js" (
    call npm run migrate:user-email-unique

    if errorlevel 1 (
        popd >nul
        echo [FAILED] User email unique migration failed.
        goto :FAIL
    )
)

popd >nul

echo [READY] User Service migrations completed.

REM ============================================================
REM 8. BUILD EXAM SERVICE WHEN IT IS NOT ALREADY RUNNING
REM ============================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$client = New-Object System.Net.Sockets.TcpClient;" ^
    "try {" ^
    "    $client.Connect('127.0.0.1', 5003);" ^
    "    exit 0" ^
    "} catch {" ^
    "    exit 1" ^
    "} finally {" ^
    "    $client.Dispose()" ^
    "}" >nul 2>&1

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
    echo Exam Service is already listening on port 5003; skipping build.
)

REM ============================================================
REM 9. START USER SERVICE
REM ============================================================

echo.
echo Starting application services...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$client = New-Object System.Net.Sockets.TcpClient;" ^
    "try {" ^
    "    $client.Connect('127.0.0.1', 5001);" ^
    "    exit 0" ^
    "} catch {" ^
    "    exit 1" ^
    "} finally {" ^
    "    $client.Dispose()" ^
    "}" >nul 2>&1

if errorlevel 1 (
    start "LMS User Service - http://localhost:5001" /D "%ROOT%user-service" cmd.exe /k "call npm run dev"
    echo [START] User Service
) else (
    echo [SKIP]  User Service is already running on port 5001.
)

REM ============================================================
REM 10. START COURSE SERVICE
REM ============================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$client = New-Object System.Net.Sockets.TcpClient;" ^
    "try {" ^
    "    $client.Connect('127.0.0.1', 5002);" ^
    "    exit 0" ^
    "} catch {" ^
    "    exit 1" ^
    "} finally {" ^
    "    $client.Dispose()" ^
    "}" >nul 2>&1

if errorlevel 1 (
    start "LMS Course Service - http://localhost:5002" /D "%ROOT%course-service" cmd.exe /k "call npm run dev"
    echo [START] Course Service
) else (
    echo [SKIP]  Course Service is already running on port 5002.
)

REM ============================================================
REM 11. START EXAM SERVICE
REM ============================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$client = New-Object System.Net.Sockets.TcpClient;" ^
    "try {" ^
    "    $client.Connect('127.0.0.1', 5003);" ^
    "    exit 0" ^
    "} catch {" ^
    "    exit 1" ^
    "} finally {" ^
    "    $client.Dispose()" ^
    "}" >nul 2>&1

if errorlevel 1 (
    start "LMS Exam Service - http://localhost:5003" /D "%ROOT%exam-service" cmd.exe /k "dotnet run --no-build"
    echo [START] Exam Service
) else (
    echo [SKIP]  Exam Service is already running on port 5003.
)

REM ============================================================
REM 12. START API GATEWAY
REM ============================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$client = New-Object System.Net.Sockets.TcpClient;" ^
    "try {" ^
    "    $client.Connect('127.0.0.1', 3000);" ^
    "    exit 0" ^
    "} catch {" ^
    "    exit 1" ^
    "} finally {" ^
    "    $client.Dispose()" ^
    "}" >nul 2>&1

if errorlevel 1 (
    start "LMS API Gateway - http://localhost:3000" /D "%ROOT%api-gateway" cmd.exe /k "call npm run dev"
    echo [START] API Gateway
) else (
    echo [SKIP]  API Gateway is already running on port 3000.
)

REM ============================================================
REM 13. START WEB CLIENT
REM ============================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$client = New-Object System.Net.Sockets.TcpClient;" ^
    "try {" ^
    "    $client.Connect('127.0.0.1', 5173);" ^
    "    exit 0" ^
    "} catch {" ^
    "    exit 1" ^
    "} finally {" ^
    "    $client.Dispose()" ^
    "}" >nul 2>&1

if errorlevel 1 (
    start "LMS Web Client - http://localhost:5173" /D "%ROOT%web-client" cmd.exe /k "call npm run dev -- --host 0.0.0.0"
    echo [START] Web Client
) else (
    echo [SKIP]  Web Client is already running on port 5173.
)

REM ============================================================
REM 14. WAIT FOR ALL APPLICATION PORTS
REM ============================================================

echo.
echo Waiting for application services...

REM User Service
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$deadline = (Get-Date).AddSeconds(60);" ^
    "do {" ^
    "    $client = New-Object System.Net.Sockets.TcpClient;" ^
    "    try {" ^
    "        $client.Connect('127.0.0.1', 5001);" ^
    "        exit 0" ^
    "    } catch {" ^
    "        Start-Sleep -Milliseconds 500" ^
    "    } finally {" ^
    "        $client.Dispose()" ^
    "    }" ^
    "} while ((Get-Date) -lt $deadline);" ^
    "exit 1" >nul 2>&1

if errorlevel 1 (
    echo [FAILED] User Service did not open port 5001.
    goto :FAIL
)

echo [READY] User Service on port 5001.

REM Course Service
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$deadline = (Get-Date).AddSeconds(60);" ^
    "do {" ^
    "    $client = New-Object System.Net.Sockets.TcpClient;" ^
    "    try {" ^
    "        $client.Connect('127.0.0.1', 5002);" ^
    "        exit 0" ^
    "    } catch {" ^
    "        Start-Sleep -Milliseconds 500" ^
    "    } finally {" ^
    "        $client.Dispose()" ^
    "    }" ^
    "} while ((Get-Date) -lt $deadline);" ^
    "exit 1" >nul 2>&1

if errorlevel 1 (
    echo [FAILED] Course Service did not open port 5002.
    goto :FAIL
)

echo [READY] Course Service on port 5002.

REM Exam Service
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$deadline = (Get-Date).AddSeconds(60);" ^
    "do {" ^
    "    $client = New-Object System.Net.Sockets.TcpClient;" ^
    "    try {" ^
    "        $client.Connect('127.0.0.1', 5003);" ^
    "        exit 0" ^
    "    } catch {" ^
    "        Start-Sleep -Milliseconds 500" ^
    "    } finally {" ^
    "        $client.Dispose()" ^
    "    }" ^
    "} while ((Get-Date) -lt $deadline);" ^
    "exit 1" >nul 2>&1

if errorlevel 1 (
    echo [FAILED] Exam Service did not open port 5003.
    goto :FAIL
)

echo [READY] Exam Service on port 5003.

REM API Gateway
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$deadline = (Get-Date).AddSeconds(60);" ^
    "do {" ^
    "    $client = New-Object System.Net.Sockets.TcpClient;" ^
    "    try {" ^
    "        $client.Connect('127.0.0.1', 3000);" ^
    "        exit 0" ^
    "    } catch {" ^
    "        Start-Sleep -Milliseconds 500" ^
    "    } finally {" ^
    "        $client.Dispose()" ^
    "    }" ^
    "} while ((Get-Date) -lt $deadline);" ^
    "exit 1" >nul 2>&1

if errorlevel 1 (
    echo [FAILED] API Gateway did not open port 3000.
    goto :FAIL
)

echo [READY] API Gateway on port 3000.

REM Web Client
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$deadline = (Get-Date).AddSeconds(90);" ^
    "do {" ^
    "    $client = New-Object System.Net.Sockets.TcpClient;" ^
    "    try {" ^
    "        $client.Connect('127.0.0.1', 5173);" ^
    "        exit 0" ^
    "    } catch {" ^
    "        Start-Sleep -Milliseconds 500" ^
    "    } finally {" ^
    "        $client.Dispose()" ^
    "    }" ^
    "} while ((Get-Date) -lt $deadline);" ^
    "exit 1" >nul 2>&1

if errorlevel 1 (
    echo [FAILED] Web Client did not open port 5173.
    echo Check the LMS Web Client window for the exact npm error.
    goto :FAIL
)

echo [READY] Web Client on port 5173.

REM ============================================================
REM 15. OPEN THE WEB APPLICATION
REM ============================================================

echo.
echo ==========================================
echo   LMS IS READY
echo ==========================================
echo.
echo Web Client:     http://localhost:5173
echo API Gateway:    http://localhost:3000
echo User Service:   http://localhost:5001
echo Course Service: http://localhost:5002
echo Exam Service:   http://localhost:5003
echo.
echo Opening the LMS website...

start "" "http://localhost:5173"

echo.
echo The website has been opened in your default browser.
echo Keep the service windows open while using the LMS.
echo.

pause
exit /b 0


:FAIL
echo.
echo ==========================================
echo   LMS STARTUP FAILED
echo ==========================================
echo.
echo No Docker volume or database data was deleted.
echo Read the error above and check any service window that opened.
echo.

pause
exit /b 1