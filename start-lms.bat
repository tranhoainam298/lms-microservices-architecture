@echo off
setlocal EnableExtensions DisableDelayedExpansion

title LMS Microservices Launcher
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo ==========================================
echo   LMS Microservices Architecture Launcher
echo ==========================================
echo.

call :require_command docker "Docker CLI"
if errorlevel 1 goto :failed

call :require_command node "Node.js"
if errorlevel 1 goto :failed

call :require_command npm "npm"
if errorlevel 1 goto :failed

call :require_command dotnet ".NET SDK"
if errorlevel 1 goto :failed

call :require_command powershell "PowerShell"
if errorlevel 1 goto :failed

call :ensure_docker
if errorlevel 1 (
  echo Docker Desktop did not become ready within the timeout.
  goto :failed
)

call :load_env_value "%ROOT%api-gateway\.env" "JWT_SECRET"
call :strip_outer_quotes JWT_SECRET

if not defined JWT_SECRET (
  echo JWT_SECRET was not found in api-gateway\.env.
  echo Create that file from api-gateway\.env.example and try again.
  goto :failed
)

echo Starting Docker infrastructure...

docker compose -f "%ROOT%infra\docker-compose.yml" up -d

if errorlevel 1 (
  echo Failed to start Docker infrastructure.
  goto :failed
)

echo.
echo Waiting for MySQL containers...

call :wait_for_port 3316 60 "User MySQL"
if errorlevel 1 goto :failed

call :wait_for_port 3317 60 "Course MySQL"
if errorlevel 1 goto :failed

call :wait_for_port 3308 60 "Exam MySQL"
if errorlevel 1 goto :failed

call :load_docker_env exam-db-mysql MYSQL_DATABASE EXAM_DB_NAME
call :load_docker_env exam-db-mysql MYSQL_USER EXAM_DB_USER
call :load_docker_env exam-db-mysql MYSQL_PASSWORD EXAM_DB_PASSWORD

for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$line = docker port exam-db-mysql 3306/tcp | Select-Object -First 1; if ($line) { ($line -split ':')[-1] }"`) do (
  set "EXAM_DB_PORT=%%P"
)

if not defined EXAM_DB_NAME (
  echo Could not read the Exam database name from the running container.
  goto :failed
)

if not defined EXAM_DB_USER (
  echo Could not read the Exam database user from the running container.
  goto :failed
)

if not defined EXAM_DB_PASSWORD (
  echo Could not read the Exam database password from the running container.
  goto :failed
)

if not defined EXAM_DB_PORT (
  echo Could not determine the Exam database host port.
  goto :failed
)

set "ConnectionStrings__DefaultConnection=Server=127.0.0.1;Port=%EXAM_DB_PORT%;Database=%EXAM_DB_NAME%;User=%EXAM_DB_USER%;Password=%EXAM_DB_PASSWORD%;"
set "COURSE_SERVICE_URL=http://localhost:5002"

echo.
echo Applying idempotent User Service migrations...

if exist "%ROOT%user-service\src\data\migrateLoginAudit.js" (
  pushd "%ROOT%user-service" >nul

  call npm run migrate:login-audit

  if errorlevel 1 (
    popd >nul
    echo Login audit migration failed.
    goto :failed
  )

  popd >nul
)

if exist "%ROOT%user-service\src\data\migrateUserStatus.js" (
  pushd "%ROOT%user-service" >nul

  call npm run migrate:user-status

  if errorlevel 1 (
    popd >nul
    echo User status migration failed.
    goto :failed
  )

  popd >nul
)

call :is_port_open 5003

if errorlevel 1 (
  echo.
  echo Building Exam Service...

  dotnet build "%ROOT%exam-service\ExamService.csproj" --nologo

  if errorlevel 1 (
    echo Exam Service build failed.
    goto :failed
  )
) else (
  echo Exam Service is already listening on port 5003; skipping build.
)

echo.
echo Starting services that are not already running...

call :start_service_if_needed 5001 "LMS User Service - http://localhost:5001" "user-service" "npm run dev"
call :start_service_if_needed 5002 "LMS Course Service - http://localhost:5002" "course-service" "npm run dev"
call :start_service_if_needed 5003 "LMS Exam Service - http://localhost:5003" "." "dotnet run --project exam-service\ExamService.csproj --no-build"
call :start_service_if_needed 3000 "LMS API Gateway - http://localhost:3000" "api-gateway" "npm run dev"
call :start_service_if_needed 5173 "LMS Web Client - http://localhost:5173" "web-client" "npm run dev -- --host 0.0.0.0"

echo.
echo Waiting for application ports...

set "START_FAILED="

call :wait_for_port 5001 30 "User Service"
if errorlevel 1 set "START_FAILED=1"

call :wait_for_port 5002 30 "Course Service"
if errorlevel 1 set "START_FAILED=1"

call :wait_for_port 5003 30 "Exam Service"
if errorlevel 1 set "START_FAILED=1"

call :wait_for_port 3000 30 "API Gateway"
if errorlevel 1 set "START_FAILED=1"

call :wait_for_port 5173 30 "Web Client"
if errorlevel 1 set "START_FAILED=1"

if defined START_FAILED (
  echo.
  echo One or more services did not become ready.
  echo Review the opened service window for error details.
  goto :failed
)

echo.
echo ==========================================
echo   LMS is ready
echo ==========================================
echo.
echo Web Client:     http://localhost:5173
echo API Gateway:    http://localhost:3000
echo User Service:   http://localhost:5001
echo Course Service: http://localhost:5002
echo Exam Service:   http://localhost:5003
echo.
echo Keep the service windows running while using the application.
echo.

if /i not "%LMS_NO_BROWSER%"=="1" (
  start "" "http://localhost:5173"
)

goto :finished


:require_command
where %~1 >nul 2>nul

if errorlevel 1 (
  echo %~2 was not found in PATH.
  exit /b 1
)

exit /b 0


:ensure_docker
docker info >nul 2>nul

if not errorlevel 1 (
  exit /b 0
)

echo Docker engine is not ready. Starting Docker Desktop...

powershell -NoProfile -Command ^
  "$path = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe';" ^
  "if (Test-Path -LiteralPath $path) {" ^
  "  Start-Process -FilePath $path -WindowStyle Hidden;" ^
  "  exit 0" ^
  "};" ^
  "exit 1"

if errorlevel 1 (
  echo Docker Desktop could not be found.
  echo Start Docker Desktop manually and try again.
  exit /b 1
)

for /l %%I in (1,1,60) do (
  docker info >nul 2>nul

  if not errorlevel 1 (
    exit /b 0
  )

  powershell -NoProfile -Command "Start-Sleep -Seconds 2"
)

exit /b 1


:is_port_open
powershell -NoProfile -Command ^
  "$client = New-Object System.Net.Sockets.TcpClient;" ^
  "try {" ^
  "  $client.Connect('127.0.0.1', %~1);" ^
  "  exit 0" ^
  "} catch {" ^
  "  exit 1" ^
  "} finally {" ^
  "  $client.Dispose()" ^
  "}" >nul 2>nul

exit /b %errorlevel%


:wait_for_port
set "WAIT_PORT=%~1"
set "WAIT_SECONDS=%~2"
set "WAIT_LABEL=%~3"

powershell -NoProfile -Command ^
  "$deadline = (Get-Date).AddSeconds(%WAIT_SECONDS%);" ^
  "do {" ^
  "  $client = New-Object System.Net.Sockets.TcpClient;" ^
  "  try {" ^
  "    $client.Connect('127.0.0.1', %WAIT_PORT%);" ^
  "    exit 0" ^
  "  } catch {" ^
  "    Start-Sleep -Milliseconds 500" ^
  "  } finally {" ^
  "    $client.Dispose()" ^
  "  }" ^
  "} while ((Get-Date) -lt $deadline);" ^
  "exit 1" >nul 2>nul

if errorlevel 1 (
  echo [FAILED] %WAIT_LABEL% did not open port %WAIT_PORT%.
  exit /b 1
)

echo [READY]  %WAIT_LABEL% on port %WAIT_PORT%.
exit /b 0


:start_service_if_needed
set "SERVICE_PORT=%~1"
set "WINDOW_TITLE=%~2"
set "SERVICE_DIR=%~3"
set "SERVICE_COMMAND=%~4"

call :is_port_open %SERVICE_PORT%

if not errorlevel 1 (
  echo [SKIP]   %WINDOW_TITLE% is already running.
  exit /b 0
)

start "%WINDOW_TITLE%" cmd /k ""cd /d "%ROOT%%SERVICE_DIR%" && %SERVICE_COMMAND%""

echo [START]  %WINDOW_TITLE%
exit /b 0


:load_env_value
set "ENV_FILE=%~1"
set "ENV_KEY=%~2"

if not exist "%ENV_FILE%" (
  exit /b 0
)

for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
  if /i "%%A"=="%ENV_KEY%" (
    set "%ENV_KEY%=%%B"
  )
)

exit /b 0


:strip_outer_quotes
call set "ENV_VALUE=%%%~1%%"

if not defined ENV_VALUE (
  exit /b 0
)

if "%ENV_VALUE:~0,1%"=="""" (
  if "%ENV_VALUE:~-1%"=="""" (
    set "ENV_VALUE=%ENV_VALUE:~1,-1%"
  )
)

if "%ENV_VALUE:~0,1%"=="'" (
  if "%ENV_VALUE:~-1%"=="'" (
    set "ENV_VALUE=%ENV_VALUE:~1,-1%"
  )
)

set "%~1=%ENV_VALUE%"
set "ENV_VALUE="

exit /b 0


:load_docker_env
set "CONTAINER_NAME=%~1"
set "DOCKER_ENV_KEY=%~2"
set "TARGET_VAR=%~3"

for /f "tokens=1,* delims==" %%A in ('docker inspect --format "{{range .Config.Env}}{{println .}}{{end}}" "%CONTAINER_NAME%" 2^>nul') do (
  if /i "%%A"=="%DOCKER_ENV_KEY%" (
    set "%TARGET_VAR%=%%B"
  )
)

exit /b 0


:failed
echo.
echo ==========================================
echo   LMS startup failed
echo ==========================================
echo.
echo No database volumes were removed or reset.
echo Review the error above and the opened service windows.
echo.

if /i "%LMS_NO_PAUSE%"=="1" (
  exit /b 1
)

pause
exit /b 1


:finished
echo.

if /i "%LMS_NO_PAUSE%"=="1" (
  exit /b 0
)

pause
exit /b 0