# Compatibility filename: this is a focused, non-destructive smoke suite for the current LMS routes.
# It never creates users, courses, enrollments, quizzes, results, or payments by default.

$ErrorActionPreference = 'Stop'
$baseUrl = if ($env:LMS_E2E_BASE_URL) { $env:LMS_E2E_BASE_URL.TrimEnd('/') } else { 'http://localhost:8080/api' }
$passed = 0
$failed = 0
$skipped = 0
$total = 0

function Invoke-ApiTest {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Method,
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][int[]]$ExpectedStatus,
        [string]$Token,
        [object]$Body,
        [string[]]$RequiredFields = @(),
        [string]$RequiredCode
    )

    $script:total++
    $headers = @{}
    if ($Token) { $headers.Authorization = "Bearer $Token" }
    $request = @{
        Uri = "$script:baseUrl$Path"
        Method = $Method
        Headers = $headers
        UseBasicParsing = $true
        TimeoutSec = 20
    }
    if ($null -ne $Body) {
        $request.ContentType = 'application/json'
        $request.Body = $Body | ConvertTo-Json -Depth 10 -Compress
    }

    $status = 0
    $content = ''
    try {
        $response = Invoke-WebRequest @request
        $status = [int]$response.StatusCode
        $content = $response.Content
    }
    catch {
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        if ($_.ErrorDetails.Message) { $content = $_.ErrorDetails.Message }
    }

    $json = $null
    if ($content) {
        try { $json = $content | ConvertFrom-Json } catch { $json = $null }
    }

    $ok = $ExpectedStatus -contains $status
    if ($ok -and $RequiredCode) { $ok = $json -and $json.code -eq $RequiredCode }
    foreach ($field in $RequiredFields) {
        if (-not $json -or -not ($json.PSObject.Properties.Name -contains $field)) { $ok = $false }
    }

    if ($ok) {
        $script:passed++
        Write-Host "PASS  $Name (HTTP $status)" -ForegroundColor Green
        return $json
    }

    $script:failed++
    Write-Host "FAIL  $Name (HTTP $status; expected $($ExpectedStatus -join '/'))" -ForegroundColor Red
    return $null
}

function Get-RoleToken {
    param([Parameter(Mandatory)][ValidateSet('student','instructor','admin')][string]$Role)

    $prefix = "LMS_E2E_$($Role.ToUpperInvariant())"
    $email = [Environment]::GetEnvironmentVariable("${prefix}_EMAIL")
    $password = [Environment]::GetEnvironmentVariable("${prefix}_PASSWORD")
    if (-not $email -or -not $password) {
        $script:skipped++
        Write-Host "SKIP  $Role login: set ${prefix}_EMAIL and ${prefix}_PASSWORD" -ForegroundColor Yellow
        return $null
    }

    $result = Invoke-ApiTest -Name "$Role login" -Method POST -Path '/auth/login' -ExpectedStatus 200 `
        -Body @{ email = $email; password = $password; role = $Role } -RequiredFields @('accessToken')
    if ($result) { return $result.accessToken }
    return $null
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' LMS current-route focused smoke suite (non-destructive)' -ForegroundColor Cyan
Write-Host " Public API base: $baseUrl" -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

Invoke-ApiTest -Name 'Published course list' -Method GET -Path '/courses' -ExpectedStatus 200 | Out-Null
Invoke-ApiTest -Name 'Profile requires token' -Method GET -Path '/users/me' -ExpectedStatus 401 -RequiredCode 'UNAUTHORIZED' | Out-Null
Invoke-ApiTest -Name 'Invalid profile token rejected' -Method GET -Path '/users/me' -Token 'invalid.token.value' -ExpectedStatus 401 -RequiredCode 'INVALID_TOKEN' | Out-Null
Invoke-ApiTest -Name 'Revenue report requires token' -Method GET -Path '/payments/reports/revenue' -ExpectedStatus 401 -RequiredCode 'UNAUTHORIZED' | Out-Null
Invoke-ApiTest -Name 'Invalid revenue token rejected' -Method GET -Path '/payments/reports/revenue' -Token 'invalid.token.value' -ExpectedStatus 401 -RequiredCode 'INVALID_TOKEN' | Out-Null
Invoke-ApiTest -Name 'Payment checkout requires token' -Method POST -Path '/payments/checkout' -Body @{ courseId = 1 } -ExpectedStatus 401 -RequiredCode 'UNAUTHORIZED' | Out-Null
Invoke-ApiTest -Name 'Deprecated mock payment completion stays disabled' -Method POST -Path '/payments/mock/complete' -ExpectedStatus 410 -RequiredCode 'ENDPOINT_DEPRECATED' | Out-Null

$studentToken = Get-RoleToken -Role student
if ($studentToken) {
    Invoke-ApiTest -Name 'Student cannot view revenue report' -Method GET -Path '/payments/reports/revenue' -Token $studentToken -ExpectedStatus 403 -RequiredCode 'FORBIDDEN' | Out-Null
}

$instructorToken = Get-RoleToken -Role instructor
if ($instructorToken) {
    Invoke-ApiTest -Name 'Instructor cannot view revenue report' -Method GET -Path '/payments/reports/revenue' -Token $instructorToken -ExpectedStatus 403 -RequiredCode 'FORBIDDEN' | Out-Null
}

$adminToken = Get-RoleToken -Role admin
if ($adminToken) {
    Invoke-ApiTest -Name 'Admin can view real revenue report' -Method GET -Path '/payments/reports/revenue' -Token $adminToken `
        -ExpectedStatus 200 -RequiredFields @('summary','courseBreakdown','transactions') | Out-Null
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "Passed: $passed  Failed: $failed  Optional skips: $skipped" -ForegroundColor Cyan
Write-Host 'No persistent test data was created by this suite.' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 }
exit 0
