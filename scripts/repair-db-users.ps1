[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$targets = @(
    @{ Container = 'user-db-mysql'; ExpectedUser = 'lms_user_admin' },
    @{ Container = 'course-db-mysql'; ExpectedUser = 'lms_course_admin' },
    @{ Container = 'exam-db-mysql'; ExpectedUser = 'lms_exam_admin' },
    @{ Container = 'payment-db-mysql'; ExpectedUser = 'lms_payment_admin' }
)

function Get-ContainerEnvironment {
    param([Parameter(Mandatory)][string]$Container)

    $json = & docker inspect --format '{{json .Config.Env}}' $Container 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($json)) {
        throw "Container '$Container' is not available."
    }

    $values = @{}
    foreach ($entry in ($json | ConvertFrom-Json)) {
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
        $state = & docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $Container 2>$null
        if ($state -eq 'healthy') {
            Write-Host "[READY] $Container"
            return
        }
        if ($state -eq 'unhealthy') {
            throw "Container '$Container' reported unhealthy."
        }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)

    throw "Timed out waiting for '$Container'."
}

foreach ($target in $targets) {
    $container = $target.Container
    Write-Host "[CHECK] $container"
    Wait-ContainerHealthy -Container $container

    $containerEnvironment = Get-ContainerEnvironment -Container $container
    $appUser = $containerEnvironment['MYSQL_USER']
    $appPassword = $containerEnvironment['MYSQL_PASSWORD']
    $rootPassword = $containerEnvironment['MYSQL_ROOT_PASSWORD']

    if ($appUser -ne $target.ExpectedUser) {
        throw "Unexpected application user configured for '$container'."
    }
    if ($appUser -notmatch '^[A-Za-z0-9_]+$') {
        throw "Unsafe application user name configured for '$container'."
    }
    if ([string]::IsNullOrEmpty($appPassword) -or [string]::IsNullOrEmpty($rootPassword)) {
        throw "Required database credentials are missing from '$container'."
    }

    $null = & docker exec -e "MYSQL_PWD=$rootPassword" $container mysql -uroot --protocol=socket --batch --skip-column-names --execute 'SELECT 1' 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Root authentication failed for an existing MySQL volume. Run repair-db-users-emergency.bat to reset MySQL credentials without deleting data."
    }

    $escapedPassword = Escape-MySqlString -Value $appPassword
    $sql = "ALTER USER '$appUser'@'%' IDENTIFIED BY '$escapedPassword'; FLUSH PRIVILEGES;"
    $null = $sql | & docker exec -i -e "MYSQL_PWD=$rootPassword" $container mysql -uroot --protocol=socket 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not align the application user for '$container'."
    }

    Write-Host "[UPDATED] $container application user"
}

Write-Host '[START] Recreating application containers with the current environment...'
& docker compose up -d user-service course-service exam-service payment-service api-gateway nginx-load-balancer
if ($LASTEXITCODE -ne 0) {
    throw 'Application containers could not be restarted.'
}

foreach ($container in @('user-service', 'course-service', 'exam-service', 'payment-service', 'api-gateway', 'nginx-load-balancer')) {
    Wait-ContainerHealthy -Container $container
}

Write-Host '[DONE] Database application users and service health are aligned.'
