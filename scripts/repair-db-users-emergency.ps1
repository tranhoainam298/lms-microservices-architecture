[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$targets = @(
    @{ Container = 'user-db-mysql'; ExpectedUser = 'lms_user_admin' },
    @{ Container = 'course-db-mysql'; ExpectedUser = 'lms_course_admin' },
    @{ Container = 'exam-db-mysql'; ExpectedUser = 'lms_exam_admin' },
    @{ Container = 'payment-db-mysql'; ExpectedUser = 'lms_payment_admin' }
)

function Invoke-NativeQuiet {
    param([Parameter(Mandatory)][scriptblock]$Command)

    $oldPreference = $ErrorActionPreference
    $hasNativePreference = Test-Path variable:PSNativeCommandUseErrorActionPreference
    if ($hasNativePreference) {
        $oldNativePreference = $PSNativeCommandUseErrorActionPreference
    }

    try {
        $ErrorActionPreference = 'Continue'
        if ($hasNativePreference) {
            $PSNativeCommandUseErrorActionPreference = $false
        }
        & $Command *> $null
        return [int]$LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $oldPreference
        if ($hasNativePreference) {
            $PSNativeCommandUseErrorActionPreference = $oldNativePreference
        }
    }
}

function Invoke-NativeCapture {
    param([Parameter(Mandatory)][scriptblock]$Command)

    $oldPreference = $ErrorActionPreference
    $hasNativePreference = Test-Path variable:PSNativeCommandUseErrorActionPreference
    if ($hasNativePreference) {
        $oldNativePreference = $PSNativeCommandUseErrorActionPreference
    }

    try {
        $ErrorActionPreference = 'Continue'
        if ($hasNativePreference) {
            $PSNativeCommandUseErrorActionPreference = $false
        }
        $output = @(& $Command 2>$null)
        return [pscustomobject]@{
            ExitCode = [int]$LASTEXITCODE
            Output = $output
        }
    }
    finally {
        $ErrorActionPreference = $oldPreference
        if ($hasNativePreference) {
            $PSNativeCommandUseErrorActionPreference = $oldNativePreference
        }
    }
}

function Get-ContainerEnvironment {
    param([Parameter(Mandatory)][object]$Inspection)

    $values = @{}
    foreach ($entry in $Inspection.Config.Env) {
        $separator = $entry.IndexOf('=')
        if ($separator -gt 0) {
            $values[$entry.Substring(0, $separator)] = $entry.Substring($separator + 1)
        }
    }
    return $values
}

function Escape-MySqlString {
    param([Parameter(Mandatory)][string]$Value)
    return $Value.Replace('\', '\\').Replace("'", "\'")
}

function Wait-ContainerHealthy {
    param(
        [Parameter(Mandatory)][string]$Container,
        [int]$TimeoutSeconds = 180
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $inspectResult = Invoke-NativeCapture -Command { & docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $Container }
        $state = if ($inspectResult.ExitCode -eq 0) { [string]($inspectResult.Output | Select-Object -First 1) } else { '' }
        if ($state -eq 'healthy') {
            Write-Host "[READY] $Container"
            return
        }
        if ($state -eq 'unhealthy') {
            throw "Container '$Container' reported unhealthy after credential repair."
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)

    throw "Timed out waiting for '$Container'."
}

function Wait-RepairMySql {
    param(
        [Parameter(Mandatory)][string]$Container,
        [int]$TimeoutSeconds = 120
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $exitCode = Invoke-NativeQuiet -Command { & docker exec $Container mysql -uroot --protocol=socket --batch --skip-column-names --execute 'SELECT 1' }
        if ($exitCode -eq 0) {
            return
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)

    throw "Temporary repair MySQL did not become ready for '$Container'."
}

function Test-ContainerExists {
    param([Parameter(Mandatory)][string]$Container)
    $exitCode = Invoke-NativeQuiet -Command { & docker inspect --format '{{.Id}}' $Container }
    return $exitCode -eq 0
}

foreach ($target in $targets) {
    $container = $target.Container
    $repairContainer = "$container-emergency-repair"
    $repairStarted = $false
    $originalStopped = $false

    Write-Host "[AUDIT] $container"
    $inspectionResult = Invoke-NativeCapture -Command { & docker inspect $container }
    $inspectionJson = $inspectionResult.Output -join [Environment]::NewLine
    if ($inspectionResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($inspectionJson)) {
        throw "Required container '$container' was not found."
    }
    $inspection = @($inspectionJson | ConvertFrom-Json)[0]
    $environment = Get-ContainerEnvironment -Inspection $inspection
    $dataMounts = @($inspection.Mounts | Where-Object { $_.Type -eq 'volume' -and $_.Destination -eq '/var/lib/mysql' })

    if ($dataMounts.Count -ne 1 -or [string]::IsNullOrWhiteSpace($dataMounts[0].Name)) {
        throw "Could not identify exactly one named data volume for '$container'."
    }

    $image = [string]$inspection.Config.Image
    $volumeName = [string]$dataMounts[0].Name
    $rootPassword = [string]$environment['MYSQL_ROOT_PASSWORD']
    $appUser = [string]$environment['MYSQL_USER']
    $appPassword = [string]$environment['MYSQL_PASSWORD']
    $database = [string]$environment['MYSQL_DATABASE']

    if ([string]::IsNullOrWhiteSpace($image) -or [string]::IsNullOrWhiteSpace($rootPassword) -or [string]::IsNullOrWhiteSpace($appPassword)) {
        throw "Required image or credential environment is missing for '$container'."
    }
    if ($appUser -ne $target.ExpectedUser -or $appUser -notmatch '^[A-Za-z0-9_]+$') {
        throw "Unexpected or unsafe application user configured for '$container'."
    }
    if ($database -notmatch '^[A-Za-z0-9_]+$') {
        throw "Unexpected or unsafe database name configured for '$container'."
    }
    if (Test-ContainerExists -Container $repairContainer) {
        throw "Temporary repair container '$repairContainer' already exists. Stop it manually before retrying."
    }

    $dataDirectoryCheck = Invoke-NativeQuiet -Command { & docker exec $container sh -c 'test -d /var/lib/mysql/mysql' }
    if ($dataDirectoryCheck -ne 0) {
        throw "The existing MySQL system data directory was not found in '$volumeName'."
    }

    Write-Host "[REPAIR] $container using its existing named volume"
    try {
        $stopExitCode = Invoke-NativeQuiet -Command { & docker stop $container }
        if ($stopExitCode -ne 0) {
            throw "Could not stop '$container'."
        }
        $originalStopped = $true

        $runResult = Invoke-NativeCapture -Command { & docker run -d --rm --network none --name $repairContainer --mount "type=volume,source=$volumeName,target=/var/lib/mysql" $image --skip-grant-tables --skip-networking=0 }
        $repairId = ($runResult.Output -join '').Trim()
        if ($runResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($repairId)) {
            throw "Could not start temporary repair MySQL for '$container'."
        }
        $repairStarted = $true
        Wait-RepairMySql -Container $repairContainer

        $escapedRootPassword = Escape-MySqlString -Value $rootPassword
        $escapedAppPassword = Escape-MySqlString -Value $appPassword
        $sql = @(
            'FLUSH PRIVILEGES;',
            "ALTER USER 'root'@'localhost' IDENTIFIED BY '$escapedRootPassword';",
            "ALTER USER IF EXISTS 'root'@'%' IDENTIFIED BY '$escapedRootPassword';",
            "CREATE USER IF NOT EXISTS '$appUser'@'%' IDENTIFIED BY '$escapedAppPassword';",
            "ALTER USER '$appUser'@'%' IDENTIFIED BY '$escapedAppPassword';",
            "ALTER USER IF EXISTS '$appUser'@'localhost' IDENTIFIED BY '$escapedAppPassword';",
            "GRANT ALL PRIVILEGES ON ``$database``.* TO '$appUser'@'%';",
            'FLUSH PRIVILEGES;'
        ) -join [Environment]::NewLine

        $sqlExitCode = Invoke-NativeQuiet -Command { $sql | & docker exec -i $repairContainer mysql -uroot --protocol=socket }
        if ($sqlExitCode -ne 0) {
            throw "MySQL account statements failed for '$container'."
        }
    }
    finally {
        if ($repairStarted -and (Test-ContainerExists -Container $repairContainer)) {
            $null = Invoke-NativeQuiet -Command { & docker stop --timeout 15 $repairContainer }
        }
        if (Test-ContainerExists -Container $repairContainer) {
            $null = Invoke-NativeQuiet -Command { & docker rm --force $repairContainer }
        }
        if ($originalStopped) {
            $null = Invoke-NativeQuiet -Command { & docker start $container }
        }
    }

    Wait-ContainerHealthy -Container $container

    $rootLoginExitCode = Invoke-NativeQuiet -Command { & docker exec -e "MYSQL_PWD=$rootPassword" $container mysql -uroot --protocol=socket --batch --skip-column-names --execute 'SELECT 1' }
    if ($rootLoginExitCode -ne 0) {
        throw "Root login verification failed for '$container'."
    }

    $appLoginExitCode = Invoke-NativeQuiet -Command { & docker exec -e "MYSQL_PWD=$appPassword" $container mysql "-u$appUser" --protocol=tcp --host=127.0.0.1 "--database=$database" --batch --skip-column-names --execute 'SELECT 1' }
    if ($appLoginExitCode -ne 0) {
        throw "Application-user login verification failed for '$container'."
    }

    Write-Host "[VERIFIED] $container root and application user"
}

Write-Host '[START] Recreating LMS application containers with aligned credentials...'
$composeExitCode = Invoke-NativeQuiet -Command { & docker compose up -d user-service course-service exam-service payment-service api-gateway nginx-load-balancer web-client }
if ($composeExitCode -ne 0) {
    throw 'LMS application containers could not be started after credential repair.'
}

foreach ($container in @('user-service', 'course-service', 'exam-service', 'payment-service', 'api-gateway', 'web-client', 'nginx-load-balancer')) {
    Wait-ContainerHealthy -Container $container
}

try {
    $health = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8080/health' -TimeoutSec 10
    if ($health.StatusCode -ne 200) {
        throw 'Unexpected health status.'
    }
}
catch {
    throw 'The public LMS health endpoint did not pass after credential repair.'
}

Write-Host '[DONE] Emergency credential repair and LMS health verification completed.'
