[CmdletBinding()]
param(
    [switch]$PreflightOnly
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$targets = @(
    @{
        Name = 'User DB'
        Container = 'user-db-mysql'
        SqlFile = 'infra/mysql-init/demo-seed-user.sql'
        RequiredTables = @('users', 'login_audit')
        Summary = "SELECT CONCAT('users=', COUNT(*)) FROM users; SELECT CONCAT('students=', COUNT(*)) FROM users WHERE role='student'; SELECT CONCAT('instructors=', COUNT(*)) FROM users WHERE role='instructor'; SELECT CONCAT('admins=', COUNT(*)) FROM users WHERE role='admin'; SELECT CONCAT('login_audit=', COUNT(*)) FROM login_audit;"
    },
    @{
        Name = 'Course DB'
        Container = 'course-db-mysql'
        SqlFile = 'infra/mysql-init/demo-seed-course.sql'
        RequiredTables = @('courses', 'lessons', 'enrollments', 'lesson_progress')
        Summary = "SELECT CONCAT('courses=', COUNT(*)) FROM courses; SELECT CONCAT('published=', COUNT(*)) FROM courses WHERE status='published'; SELECT CONCAT('draft=', COUNT(*)) FROM courses WHERE status='draft'; SELECT CONCAT('lessons=', COUNT(*)) FROM lessons; SELECT CONCAT('enrollments=', COUNT(*)) FROM enrollments; SELECT CONCAT('lesson_progress=', COUNT(*)) FROM lesson_progress;"
    },
    @{
        Name = 'Exam DB'
        Container = 'exam-db-mysql'
        SqlFile = 'infra/mysql-init/demo-seed-exam.sql'
        RequiredTables = @('quizzes', 'questions', 'quiz_results')
        Summary = "SELECT CONCAT('quizzes=', COUNT(*)) FROM quizzes; SELECT CONCAT('questions=', COUNT(*)) FROM questions; SELECT CONCAT('results=', COUNT(*)) FROM quiz_results;"
    },
    @{
        Name = 'Payment DB'
        Container = 'payment-db-mysql'
        SqlFile = 'infra/mysql-init/demo-seed-payment.sql'
        RequiredTables = @('transactions')
        Summary = "SELECT CONCAT('transactions=', COUNT(*)) FROM transactions; SELECT CONCAT('successful=', COUNT(*)) FROM transactions WHERE status='success'; SELECT CONCAT('pending=', COUNT(*)) FROM transactions WHERE status='pending'; SELECT CONCAT('failed=', COUNT(*)) FROM transactions WHERE status='failed'; SELECT CONCAT('successful_revenue_vnd=', COALESCE(SUM(amount), 0)) FROM transactions WHERE status='success';"
    }
)

function Invoke-Docker {
    param(
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][string]$FailureMessage,
        [switch]$Capture
    )

    $oldPreference = $ErrorActionPreference
    $hadNativePreference = Test-Path variable:PSNativeCommandUseErrorActionPreference
    if ($hadNativePreference) {
        $oldNativePreference = $PSNativeCommandUseErrorActionPreference
    }

    try {
        $ErrorActionPreference = 'Continue'
        if ($hadNativePreference) {
            $PSNativeCommandUseErrorActionPreference = $false
        }
        $output = & docker @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $oldPreference
        if ($hadNativePreference) {
            $PSNativeCommandUseErrorActionPreference = $oldNativePreference
        }
    }

    if ($exitCode -ne 0) {
        throw $FailureMessage
    }
    if ($Capture) {
        return @($output)
    }
}

function Assert-ContainerRunning {
    param([Parameter(Mandatory)][string]$Container)

    $state = Invoke-Docker -Arguments @('inspect', '--format', '{{.State.Running}}', $Container) `
        -FailureMessage "Required container '$Container' is unavailable." -Capture
    if (($state | Select-Object -First 1).ToString().Trim().ToLowerInvariant() -ne 'true') {
        throw "Required container '$Container' is not running. Start the LMS first with start-lms.bat."
    }
}

function Get-ContainerEnvironment {
    param([Parameter(Mandatory)][string]$Container)

    $json = Invoke-Docker -Arguments @('inspect', '--format', '{{json .Config.Env}}', $Container) `
        -FailureMessage "Could not inspect '$Container'." -Capture
    $entries = (($json -join '') | ConvertFrom-Json)
    $values = @{}
    foreach ($entry in $entries) {
        $separator = $entry.IndexOf('=')
        if ($separator -gt 0) {
            $values[$entry.Substring(0, $separator)] = $entry.Substring($separator + 1)
        }
    }
    return $values
}

function Invoke-MySqlQuery {
    param(
        [Parameter(Mandatory)][string]$Container,
        [Parameter(Mandatory)][string]$Sql
    )

    $environment = Get-ContainerEnvironment -Container $Container
    $user = $environment['MYSQL_USER']
    $password = $environment['MYSQL_PASSWORD']
    $database = $environment['MYSQL_DATABASE']
    if ([string]::IsNullOrWhiteSpace($user) -or [string]::IsNullOrEmpty($password) -or [string]::IsNullOrWhiteSpace($database)) {
        throw "Required database configuration is missing from '$Container'."
    }

    return Invoke-Docker -Arguments @(
        'exec', '-e', "MYSQL_PWD=$password", $Container,
        'mysql', '--default-character-set=utf8mb4', '--batch', '--skip-column-names', "-u$user", $database, '--execute', $Sql
    ) -FailureMessage "Database query failed for '$Container'. If credentials are stale, use the documented database-user repair flow." -Capture
}

function Assert-RequiredSchema {
    param(
        [Parameter(Mandatory)][hashtable]$Target
    )

    $quotedTables = ($Target.RequiredTables | ForEach-Object { "'$_'" }) -join ','
    $sql = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ($quotedTables);"
    $result = Invoke-MySqlQuery -Container $Target.Container -Sql $sql
    $countText = ($result | Select-Object -First 1).ToString().Trim()
    [int]$tableCount = 0
    if (-not [int]::TryParse($countText, [ref]$tableCount) -or $tableCount -ne $Target.RequiredTables.Count) {
        throw "The expected schema is incomplete in '$($Target.Container)'. Start the LMS services so their additive migrations can complete, then retry."
    }
}

function Get-RequiredSeedMatches {
    param(
        [Parameter(Mandatory)][string]$Text,
        [Parameter(Mandatory)][string]$Pattern,
        [Parameter(Mandatory)][int]$ExpectedCount,
        [Parameter(Mandatory)][string]$Label
    )

    $matches = [regex]::Matches($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)
    if ($matches.Count -ne $ExpectedCount) {
        throw "Seed identity manifest for $Label is incomplete: expected $ExpectedCount rows, found $($matches.Count)."
    }
    return @($matches)
}

function Get-DemoIdentityManifest {
    $seedText = @{}
    foreach ($target in $targets) {
        $path = Join-Path $projectRoot $target.SqlFile
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw "Seed source is missing: $($target.SqlFile)"
        }
        $seedText[$target.Container] = Get-Content -LiteralPath $path -Raw
    }

    $users = Get-RequiredSeedMatches -Text $seedText['user-db-mysql'] `
        -Pattern "^\s*\((?<Id>9\d{3}),\s*'(?<Email>[^']+@lms\.demo)'" -ExpectedCount 27 -Label 'users' |
        ForEach-Object { [pscustomobject]@{ Id = [int]$_.Groups['Id'].Value; Email = $_.Groups['Email'].Value } }

    $auditUsers = Get-RequiredSeedMatches -Text $seedText['user-db-mysql'] `
        -Pattern "(?:SELECT|UNION ALL SELECT)\s+(?<Sequence>\d+)(?:\s+seq)?,\s*(?<UserId>9\d{3})(?:\s+user_id)?" `
        -ExpectedCount 27 -Label 'login audit users' |
        ForEach-Object {
            [pscustomobject]@{
                Sequence = [int]$_.Groups['Sequence'].Value
                UserId = [int]$_.Groups['UserId'].Value
            }
        }

    $audits = foreach ($auditUser in $auditUsers) {
        foreach ($attempt in 1..3) {
            [pscustomobject]@{
                Id = 95000 + ($auditUser.Sequence * 10) + $attempt
                UserId = $auditUser.UserId
            }
        }
    }

    $courses = Get-RequiredSeedMatches -Text $seedText['course-db-mysql'] `
        -Pattern "^\s*\((?<Id>200(?:0[1-9]|1[0-2])),\s*'(?<Title>[^']+)'" -ExpectedCount 12 -Label 'courses' |
        ForEach-Object { [pscustomobject]@{ Id = [int]$_.Groups['Id'].Value; Title = $_.Groups['Title'].Value } }

    $lessons = for ($courseIndex = 0; $courseIndex -lt $courses.Count; $courseIndex++) {
        foreach ($orderIndex in 1..5) {
            [pscustomobject]@{
                Id = 21000 + ($courseIndex * 5) + $orderIndex
                CourseId = $courses[$courseIndex].Id
                OrderIndex = $orderIndex
            }
        }
    }

    $enrollments = Get-RequiredSeedMatches -Text $seedText['course-db-mysql'] `
        -Pattern "^\s*\((?<Id>220\d{2}),\s*(?<StudentId>92\d{2}),\s*(?<CourseId>200\d{2}),\s*(?<Progress>0|20|40|60|80|100),\s*'active'" `
        -ExpectedCount 40 -Label 'enrollments' |
        ForEach-Object {
            [pscustomobject]@{
                Id = [int]$_.Groups['Id'].Value
                StudentId = [int]$_.Groups['StudentId'].Value
                CourseId = [int]$_.Groups['CourseId'].Value
            }
        }

    $quizzes = Get-RequiredSeedMatches -Text $seedText['exam-db-mysql'] `
        -Pattern "^\s*\((?<Id>3000[1-8]),\s*(?<CourseId>2000[1-8]),\s*(?<InstructorId>910[1-4]),\s*'(?<Title>[^']+)'" `
        -ExpectedCount 8 -Label 'quizzes' |
        ForEach-Object {
            [pscustomobject]@{
                Id = [int]$_.Groups['Id'].Value
                CourseId = [int]$_.Groups['CourseId'].Value
                InstructorId = [int]$_.Groups['InstructorId'].Value
                Title = $_.Groups['Title'].Value
            }
        }

    $questions = Get-RequiredSeedMatches -Text $seedText['exam-db-mysql'] `
        -Pattern "^\s*\((?<Id>310\d{2}),\s*(?<CourseId>2000[1-8]),\s*(?<QuizId>3000[1-8]),.*?,\s*(?<OrderIndex>[1-5])\),?$" `
        -ExpectedCount 40 -Label 'questions' |
        ForEach-Object {
            [pscustomobject]@{
                Id = [int]$_.Groups['Id'].Value
                CourseId = [int]$_.Groups['CourseId'].Value
                QuizId = [int]$_.Groups['QuizId'].Value
                OrderIndex = [int]$_.Groups['OrderIndex'].Value
            }
        }

    $results = Get-RequiredSeedMatches -Text $seedText['exam-db-mysql'] `
        -Pattern "^\s*\((?<Id>320\d{2}),\s*(?<StudentId>92\d{2}),\s*(?<QuizId>3000[1-8])," -ExpectedCount 24 -Label 'quiz results' |
        ForEach-Object {
            [pscustomobject]@{
                Id = [int]$_.Groups['Id'].Value
                StudentId = [int]$_.Groups['StudentId'].Value
                QuizId = [int]$_.Groups['QuizId'].Value
            }
        }

    $payments = Get-RequiredSeedMatches -Text $seedText['payment-db-mysql'] `
        -Pattern "^\s*\((?<Id>400\d{2}),\s*(?<StudentId>92\d{2}),\s*(?<CourseId>2000[2-8]),\s*\d+,\s*'(?:success|pending|failed)',\s*'(?<Gateway>demo_seed)',\s*'(?<GatewayTransactionId>DEMO-SEED-\d{4})'" `
        -ExpectedCount 36 -Label 'payments' |
        ForEach-Object {
            [pscustomobject]@{
                Id = [int]$_.Groups['Id'].Value
                StudentId = [int]$_.Groups['StudentId'].Value
                CourseId = [int]$_.Groups['CourseId'].Value
                Gateway = $_.Groups['Gateway'].Value
                GatewayTransactionId = $_.Groups['GatewayTransactionId'].Value
            }
        }

    return @{
        Users = @($users)
        Audits = @($audits)
        Courses = @($courses)
        Lessons = @($lessons)
        Enrollments = @($enrollments)
        Quizzes = @($quizzes)
        Questions = @($questions)
        Results = @($results)
        Payments = @($payments)
    }
}

function Assert-CrossDomainIdentityManifest {
    param([Parameter(Mandatory)][hashtable]$Manifest)

    $userIds = [System.Collections.Generic.HashSet[int]]::new([int[]]$Manifest.Users.Id)
    $courseIds = [System.Collections.Generic.HashSet[int]]::new([int[]]$Manifest.Courses.Id)
    $quizIds = [System.Collections.Generic.HashSet[int]]::new([int[]]$Manifest.Quizzes.Id)
    $quizCourses = @{}
    foreach ($quiz in $Manifest.Quizzes) { $quizCourses[$quiz.Id] = $quiz.CourseId }

    foreach ($enrollment in $Manifest.Enrollments) {
        if (-not $userIds.Contains($enrollment.StudentId) -or -not $courseIds.Contains($enrollment.CourseId)) {
            throw "Cross-database seed identity is invalid for enrollment $($enrollment.Id)."
        }
    }
    foreach ($quiz in $Manifest.Quizzes) {
        if (-not $userIds.Contains($quiz.InstructorId) -or -not $courseIds.Contains($quiz.CourseId)) {
            throw "Cross-database seed identity is invalid for quiz $($quiz.Id)."
        }
    }
    foreach ($question in $Manifest.Questions) {
        if (-not $quizIds.Contains($question.QuizId) -or $quizCourses[$question.QuizId] -ne $question.CourseId) {
            throw "Cross-database seed identity is invalid for question $($question.Id)."
        }
    }
    foreach ($result in $Manifest.Results) {
        if (-not $userIds.Contains($result.StudentId) -or -not $quizIds.Contains($result.QuizId)) {
            throw "Cross-database seed identity is invalid for quiz result $($result.Id)."
        }
    }
    foreach ($payment in $Manifest.Payments) {
        if (-not $userIds.Contains($payment.StudentId) -or -not $courseIds.Contains($payment.CourseId)) {
            throw "Cross-database seed identity is invalid for payment $($payment.Id)."
        }
    }
}

function ConvertTo-SqlLiteral {
    param([AllowNull()]$Value)

    if ($null -eq $Value) { return 'NULL' }
    if ($Value -is [byte] -or $Value -is [int16] -or $Value -is [int32] -or $Value -is [int64] -or
        $Value -is [uint16] -or $Value -is [uint32] -or $Value -is [uint64] -or $Value -is [decimal]) {
        return $Value.ToString([System.Globalization.CultureInfo]::InvariantCulture)
    }
    return "'$(($Value.ToString()).Replace("'", "''"))'"
}

function New-ExpectedRowSetSql {
    param(
        [Parameter(Mandatory)][object[]]$Rows,
        [Parameter(Mandatory)][string[]]$Columns
    )

    return (($Rows | ForEach-Object {
        $row = $_
        $select = $Columns | ForEach-Object { "$(ConvertTo-SqlLiteral $row.$_) AS $_" }
        "SELECT $($select -join ', ')"
    }) -join ' UNION ALL ')
}

function Get-DemoSeedCollisions {
    param(
        [Parameter(Mandatory)][hashtable]$Target,
        [Parameter(Mandatory)][hashtable]$Manifest
    )

    switch ($Target.Container) {
        'user-db-mysql' {
            $users = New-ExpectedRowSetSql -Rows $Manifest.Users -Columns @('Id', 'Email')
            $audits = New-ExpectedRowSetSql -Rows $Manifest.Audits -Columns @('Id', 'UserId')
            $sql = @"
SELECT CONCAT('users:', expected.Id, ':', expected.Email)
FROM ($users) expected
JOIN users actual ON actual.id = expected.Id OR actual.email = expected.Email
WHERE actual.id <> expected.Id OR BINARY actual.email <> BINARY expected.Email
UNION ALL
SELECT CONCAT('login_audit:', expected.Id)
FROM ($audits) expected
JOIN login_audit actual ON actual.id = expected.Id
WHERE COALESCE(actual.user_id, -1) <> expected.UserId;
"@
        }
        'course-db-mysql' {
            $courses = New-ExpectedRowSetSql -Rows $Manifest.Courses -Columns @('Id', 'Title')
            $lessons = New-ExpectedRowSetSql -Rows $Manifest.Lessons -Columns @('Id', 'CourseId', 'OrderIndex')
            $enrollments = New-ExpectedRowSetSql -Rows $Manifest.Enrollments -Columns @('Id', 'StudentId', 'CourseId')
            $sql = @"
SELECT CONCAT('courses:', expected.Id, ':', expected.Title)
FROM ($courses) expected
JOIN courses actual ON actual.id = expected.Id OR BINARY actual.title = BINARY expected.Title
WHERE actual.id <> expected.Id OR BINARY actual.title <> BINARY expected.Title
UNION ALL
SELECT CONCAT('lessons:', expected.Id)
FROM ($lessons) expected
JOIN lessons actual ON actual.id = expected.Id OR (actual.course_id = expected.CourseId AND actual.order_index = expected.OrderIndex)
WHERE actual.id <> expected.Id OR actual.course_id <> expected.CourseId OR actual.order_index <> expected.OrderIndex
UNION ALL
SELECT CONCAT('enrollments:', expected.Id)
FROM ($enrollments) expected
JOIN enrollments actual ON actual.id = expected.Id OR (actual.student_id = expected.StudentId AND actual.course_id = expected.CourseId)
WHERE actual.id <> expected.Id OR actual.student_id <> expected.StudentId OR actual.course_id <> expected.CourseId;
"@
        }
        'exam-db-mysql' {
            $quizzes = New-ExpectedRowSetSql -Rows $Manifest.Quizzes -Columns @('Id', 'CourseId', 'InstructorId', 'Title')
            $questions = New-ExpectedRowSetSql -Rows $Manifest.Questions -Columns @('Id', 'CourseId', 'QuizId', 'OrderIndex')
            $results = New-ExpectedRowSetSql -Rows $Manifest.Results -Columns @('Id', 'StudentId', 'QuizId')
            $sql = @"
SELECT CONCAT('quizzes:', expected.Id, ':', expected.Title)
FROM ($quizzes) expected
JOIN quizzes actual ON actual.Id = expected.Id OR BINARY actual.Title = BINARY expected.Title
WHERE actual.Id <> expected.Id OR actual.CourseId <> expected.CourseId OR actual.InstructorId <> expected.InstructorId OR BINARY actual.Title <> BINARY expected.Title
UNION ALL
SELECT CONCAT('questions:', expected.Id)
FROM ($questions) expected
JOIN questions actual ON actual.Id = expected.Id OR (actual.QuizId = expected.QuizId AND actual.OrderIndex = expected.OrderIndex)
WHERE actual.Id <> expected.Id OR actual.CourseId <> expected.CourseId OR actual.QuizId <> expected.QuizId OR actual.OrderIndex <> expected.OrderIndex
UNION ALL
SELECT CONCAT('quiz_results:', expected.Id)
FROM ($results) expected
JOIN quiz_results actual ON actual.Id = expected.Id OR (actual.StudentId = expected.StudentId AND actual.QuizId = expected.QuizId)
WHERE actual.Id <> expected.Id OR actual.StudentId <> expected.StudentId OR actual.QuizId <> expected.QuizId;
"@
        }
        'payment-db-mysql' {
            $payments = New-ExpectedRowSetSql -Rows $Manifest.Payments -Columns @('Id', 'StudentId', 'CourseId', 'Gateway', 'GatewayTransactionId')
            $sql = @"
SELECT CONCAT('transactions:', expected.Id, ':', expected.GatewayTransactionId)
FROM ($payments) expected
JOIN transactions actual ON actual.id = expected.Id OR BINARY actual.gateway_transaction_id = BINARY expected.GatewayTransactionId
WHERE actual.id <> expected.Id OR actual.student_id <> expected.StudentId OR actual.course_id <> expected.CourseId
  OR BINARY actual.gateway <> BINARY expected.Gateway OR BINARY actual.gateway_transaction_id <> BINARY expected.GatewayTransactionId;
"@
        }
        default { throw "No collision guard is defined for '$($Target.Container)'." }
    }

    return @(Invoke-MySqlQuery -Container $Target.Container -Sql $sql | Where-Object { -not [string]::IsNullOrWhiteSpace($_.ToString()) })
}

function Assert-DemoSeedPreflight {
    param([Parameter(Mandatory)][hashtable]$Manifest)

    $collisions = @()
    foreach ($target in $targets) {
        foreach ($collision in Get-DemoSeedCollisions -Target $target -Manifest $Manifest) {
            $collisions += "$($target.Name)/$($collision.ToString().Trim())"
        }
    }
    if ($collisions.Count -gt 0) {
        $details = $collisions -join ', '
        throw "Demo seed identity collision detected before any write: $details. No demo data was changed. Choose different IDs or resolve the conflicting rows manually."
    }
}

function Apply-DemoSeed {
    param([Parameter(Mandatory)][hashtable]$Target)

    $localPath = Join-Path $projectRoot $Target.SqlFile
    if (-not (Test-Path -LiteralPath $localPath -PathType Leaf)) {
        throw "Seed source is missing: $($Target.SqlFile)"
    }

    $container = $Target.Container
    $environment = Get-ContainerEnvironment -Container $container
    $user = $environment['MYSQL_USER']
    $password = $environment['MYSQL_PASSWORD']
    $database = $environment['MYSQL_DATABASE']
    if ([string]::IsNullOrWhiteSpace($user) -or [string]::IsNullOrEmpty($password) -or [string]::IsNullOrWhiteSpace($database)) {
        throw "Required database configuration is missing from '$container'."
    }
    $remotePath = "/tmp/lms-$container-demo-seed.sql"
    Invoke-Docker -Arguments @('cp', $localPath, "${container}:$remotePath") `
        -FailureMessage "Could not stage demo data for '$($Target.Container)'."

    Invoke-Docker -Arguments @(
        'exec', '-e', "MYSQL_PWD=$password", $container,
        'mysql', '--default-character-set=utf8mb4', "-u$user", $database, '--execute', "source $remotePath"
    ) -FailureMessage "Demo data could not be applied to '$container'. No existing rows were removed."
}

try {
    Set-Location $projectRoot
    Invoke-Docker -Arguments @('--version') -FailureMessage 'Docker is not available.' | Out-Null
    Invoke-Docker -Arguments @('compose', 'version') -FailureMessage 'Docker Compose is not available.' | Out-Null

    Write-Host '[LMS DEMO] Validating database containers and schemas...'
    foreach ($target in $targets) {
        Assert-ContainerRunning -Container $target.Container
        Assert-RequiredSchema -Target $target
        Write-Host "[READY] $($target.Name)"
    }

    Write-Host '[LMS DEMO] Running read-only collision checks across all demo identities...'
    $manifest = Get-DemoIdentityManifest
    Assert-CrossDomainIdentityManifest -Manifest $manifest
    Assert-DemoSeedPreflight -Manifest $manifest
    Write-Host '[READY] No deterministic ID or natural-key collisions detected.'

    if ($PreflightOnly) {
        Write-Host '[DONE] Read-only demo seed preflight passed. No seed SQL was applied.'
        exit 0
    }

    Write-Host '[LMS DEMO] Applying deterministic, idempotent demo records...'
    foreach ($target in $targets) {
        Apply-DemoSeed -Target $target
        Write-Host "[SEEDED] $($target.Name)"
    }

    Write-Host ''
    Write-Host '[LMS DEMO] Current database summary:'
    foreach ($target in $targets) {
        Write-Host "--- $($target.Name) ---"
        Invoke-MySqlQuery -Container $target.Container -Sql $target.Summary | ForEach-Object { Write-Host $_ }
    }

    Write-Host ''
    Write-Host '[DONE] Demo data is ready. Running this command again is safe and does not duplicate the seeded records.'
    exit 0
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
