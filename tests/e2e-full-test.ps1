# LMS Microservices - Comprehensive E2E Test
# Tests ALL features end-to-end

$baseUrl = "http://localhost:8080"
$passed = 0
$failed = 0
$total = 0

function Test-Api {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [string]$Body = $null,
        [string]$Token = $null,
        [int]$ExpectedStatus = 200,
        [string]$ExpectContains = $null
    )
    $script:total++
    Write-Host "`n--- TEST $script:total : $Name ---" -ForegroundColor Cyan
    try {
        $headers = @{}
        if ($Token) { $headers["Authorization"] = "Bearer $Token" }
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
            UseBasicParsing = $true
            Headers = $headers
        }
        if ($Body) { $params["Body"] = $Body }
        
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        $content = $response.Content
        
        if ($statusCode -eq $ExpectedStatus) {
            if ($ExpectContains -and $content -notlike "*$ExpectContains*") {
                Write-Host "  FAIL: Expected content containing '$ExpectContains'" -ForegroundColor Red
                Write-Host "  Got: $content" -ForegroundColor Yellow
                $script:failed++
                return $null
            }
            Write-Host "  PASS (Status: $statusCode)" -ForegroundColor Green
            Write-Host "  Response: $($content.Substring(0, [Math]::Min(200, $content.Length)))" -ForegroundColor Gray
            $script:passed++
            return ($content | ConvertFrom-Json)
        } else {
            Write-Host "  FAIL: Expected $ExpectedStatus, got $statusCode" -ForegroundColor Red
            $script:failed++
            return $null
        }
    } catch {
        $errStatus = 0
        $errBody = ""
        if ($_.Exception.Response) {
            $errStatus = [int]$_.Exception.Response.StatusCode
            try { $errBody = $_.ErrorDetails.Message } catch {}
        }
        if ($errStatus -eq $ExpectedStatus) {
            Write-Host "  PASS (Status: $errStatus)" -ForegroundColor Green
            Write-Host "  Response: $errBody" -ForegroundColor Gray
            $script:passed++
            if ($errBody) { return ($errBody | ConvertFrom-Json) }
            return $null
        }
        Write-Host "  FAIL: Expected $ExpectedStatus, got error $errStatus" -ForegroundColor Red
        Write-Host "  Error: $errBody" -ForegroundColor Yellow
        $script:failed++
        return $null
    }
}

Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  LMS MICROSERVICES - FULL E2E TEST SUITE" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta

# ============================
# 1. AUTH TESTS
# ============================
Write-Host "`n========== AUTH TESTS ==========" -ForegroundColor Yellow

# Test 1: Register new student
$ts = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
$regResult = Test-Api -Name "Register Student" -Method POST `
    -Url "$baseUrl/auth/register" `
    -Body "{`"email`":`"e2e_$ts@lms.com`",`"password`":`"Test1234!`",`"fullName`":`"E2E Student`",`"role`":`"student`"}" `
    -ExpectedStatus 201 -ExpectContains "email"

# Test 2: Duplicate registration
Test-Api -Name "Duplicate Registration (should fail)" -Method POST `
    -Url "$baseUrl/auth/register" `
    -Body "{`"email`":`"e2e_$ts@lms.com`",`"password`":`"Test1234!`",`"fullName`":`"E2E Student`",`"role`":`"student`"}" `
    -ExpectedStatus 409 -ExpectContains "ACCOUNT_ALREADY_EXISTS"

# Test 3: Registration with invalid email
Test-Api -Name "Register Invalid Email" -Method POST `
    -Url "$baseUrl/auth/register" `
    -Body "{`"email`":`"notanemail`",`"password`":`"Test1234!`",`"fullName`":`"Bad Email`",`"role`":`"student`"}" `
    -ExpectedStatus 400 -ExpectContains "INVALID_EMAIL"

# Test 4: Registration with weak password
Test-Api -Name "Register Weak Password" -Method POST `
    -Url "$baseUrl/auth/register" `
    -Body "{`"email`":`"weak_$ts@lms.com`",`"password`":`"123`",`"fullName`":`"Weak Pass`",`"role`":`"student`"}" `
    -ExpectedStatus 400

# Test 5: Registration as instructor (should be forbidden)
Test-Api -Name "Register as Instructor (forbidden)" -Method POST `
    -Url "$baseUrl/auth/register" `
    -Body "{`"email`":`"inst_$ts@lms.com`",`"password`":`"Test1234!`",`"fullName`":`"Bad Inst`",`"role`":`"instructor`"}" `
    -ExpectedStatus 403

# Test 6: Login as student
$loginResult = Test-Api -Name "Login Student" -Method POST `
    -Url "$baseUrl/auth/login" `
    -Body "{`"email`":`"e2e_$ts@lms.com`",`"password`":`"Test1234!`",`"role`":`"student`"}" `
    -ExpectedStatus 200 -ExpectContains "accessToken"
$studentToken = $loginResult.accessToken

# Test 7: Login with wrong password
Test-Api -Name "Login Wrong Password" -Method POST `
    -Url "$baseUrl/auth/login" `
    -Body "{`"email`":`"e2e_$ts@lms.com`",`"password`":`"WrongPass1!`",`"role`":`"student`"}" `
    -ExpectedStatus 401 -ExpectContains "INVALID_LOGIN"

# Test 8: Login as instructor
$instrLogin = Test-Api -Name "Login Instructor" -Method POST `
    -Url "$baseUrl/auth/login" `
    -Body "{`"email`":`"instructor@lms.com`",`"password`":`"Instructor1!`",`"role`":`"instructor`"}" `
    -ExpectedStatus 200 -ExpectContains "accessToken"
$instructorToken = $instrLogin.accessToken

# ============================
# 2. USER/PROFILE TESTS
# ============================
Write-Host "`n========== USER/PROFILE TESTS ==========" -ForegroundColor Yellow

# Test 9: Get profile (student)
Test-Api -Name "Get Student Profile" -Method GET `
    -Url "$baseUrl/users/me" `
    -Token $studentToken `
    -ExpectedStatus 200 -ExpectContains "fullName"

# Test 10: Get profile without token
Test-Api -Name "Get Profile (no auth)" -Method GET `
    -Url "$baseUrl/users/me" `
    -ExpectedStatus 401

# Test 11: Get instructor profile
Test-Api -Name "Get Instructor Profile" -Method GET `
    -Url "$baseUrl/users/me" `
    -Token $instructorToken `
    -ExpectedStatus 200 -ExpectContains "instructor"

# ============================
# 3. COURSE TESTS
# ============================
Write-Host "`n========== COURSE TESTS ==========" -ForegroundColor Yellow

# Test 12: List courses (public, no auth)
Test-Api -Name "List Courses (public)" -Method GET `
    -Url "$baseUrl/courses" `
    -ExpectedStatus 200

# Test 13: Instructor creates draft course
$draftResult = Test-Api -Name "Instructor Creates Draft Course" -Method POST `
    -Url "$baseUrl/courses/draft" `
    -Body "{`"title`":`"E2E Test Course`",`"description`":`"A comprehensive test course`",`"price`":50000}" `
    -Token $instructorToken `
    -ExpectedStatus 201 -ExpectContains "title"
$courseId = if ($draftResult) { if ($draftResult.course) { $draftResult.course.id } else { $draftResult.id } } else { $null }

# Test 14: Student cannot create draft
Test-Api -Name "Student Cannot Create Draft" -Method POST `
    -Url "$baseUrl/courses/draft" `
    -Body "{`"title`":`"Hacked Course`",`"description`":`"No`",`"price`":0}" `
    -Token $studentToken `
    -ExpectedStatus 403

# Test 15: Instructor views own drafts
Test-Api -Name "Instructor Views Drafts" -Method GET `
    -Url "$baseUrl/courses/drafts/mine" `
    -Token $instructorToken `
    -ExpectedStatus 200

if ($courseId) {
    # Test 16: Instructor adds lesson to draft
    $lessonResult = Test-Api -Name "Add Lesson to Draft" -Method POST `
        -Url "$baseUrl/courses/drafts/$courseId/lessons" `
        -Body "{`"title`":`"Lesson 1: Introduction`",`"content`":`"Welcome to the course!`",`"videoUrl`":`"https://example.com/video1.mp4`",`"orderIndex`":1}" `
        -Token $instructorToken `
        -ExpectedStatus 201
    $lessonId = if ($lessonResult) { $lessonResult.id } else { $null }

    # Test 17: Instructor views lessons for draft
    Test-Api -Name "View Lessons for Draft" -Method GET `
        -Url "$baseUrl/courses/drafts/$courseId/lessons" `
        -Token $instructorToken `
        -ExpectedStatus 200

    # Test 18: Add second lesson
    Test-Api -Name "Add Lesson 2" -Method POST `
        -Url "$baseUrl/courses/drafts/$courseId/lessons" `
        -Body "{`"title`":`"Lesson 2: Advanced Topics`",`"content`":`"Deeper material here.`",`"documentUrl`":`"https://example.com/doc2.pdf`",`"orderIndex`":2}" `
        -Token $instructorToken `
        -ExpectedStatus 201

    # Test 19: Update draft course
    Test-Api -Name "Update Draft Course" -Method PATCH `
        -Url "$baseUrl/courses/drafts/$courseId" `
        -Body "{`"title`":`"E2E Test Course (Updated)`",`"description`":`"Updated description`",`"price`":50000}" `
        -Token $instructorToken `
        -ExpectedStatus 200

    # ============================
    # 4. EXAM/QUIZ TESTS (before publishing course)
    # ============================
    Write-Host "`n========== EXAM/QUIZ TESTS ==========" -ForegroundColor Yellow

    # Test 20: Instructor creates quiz (on draft course)
    $quizResult = Test-Api -Name "Instructor Creates Quiz" -Method POST `
        -Url "$baseUrl/exams/courses/$courseId/quizzes" `
        -Body "{`"title`":`"E2E Quiz`",`"description`":`"Test quiz`",`"durationMinutes`":30,`"passingScore`":50,`"questions`":[{`"questionText`":`"What is 2+2?`",`"questionType`":`"single_choice`",`"options`":[`"3`",`"4`",`"5`",`"6`"],`"correctOptionIndex`":1,`"points`":10}]}" `
        -Token $instructorToken `
        -ExpectedStatus 201
    $quizId = if ($quizResult) { $quizResult.id } else { $null }

    if ($quizId) {
        # Test 21: Instructor views own quizzes
        Test-Api -Name "Instructor Views Own Quizzes" -Method GET `
            -Url "$baseUrl/exams/courses/$courseId/quizzes/mine" `
            -Token $instructorToken `
            -ExpectedStatus 200
    }

    # Test 22: Publish draft course
    $publishResult = Test-Api -Name "Publish Draft Course" -Method PATCH `
        -Url "$baseUrl/courses/drafts/$courseId/publish" `
        -Token $instructorToken `
        -ExpectedStatus 200

    # Test 23: Verify published course in public list
    Test-Api -Name "Published Course in List" -Method GET `
        -Url "$baseUrl/courses" `
        -ExpectedStatus 200 -ExpectContains "E2E Test Course"

    # Test 24: Student views quiz results
    Test-Api -Name "Student Views Quiz Results" -Method GET `
        -Url "$baseUrl/exams/results/mine" `
        -Token $studentToken `
        -ExpectedStatus 200
}

# ============================
# 5. PAYMENT TESTS
# ============================
Write-Host "`n========== PAYMENT TESTS ==========" -ForegroundColor Yellow

if ($courseId -and $studentToken) {
    # Test 29: Student creates payment checkout (may fail with 503 if ZaloPay not configured)
    $payResult = Test-Api -Name "Create Payment Checkout" -Method POST `
        -Url "$baseUrl/payments/checkout" `
        -Body "{`"courseId`":$courseId}" `
        -Token $studentToken `
        -ExpectedStatus 503
}

# ============================
# 6. ENROLLMENT TESTS
# ============================
Write-Host "`n========== ENROLLMENT TESTS ==========" -ForegroundColor Yellow

# Test 31: Student views enrolled courses
Test-Api -Name "Student Views Enrolled Courses" -Method GET `
    -Url "$baseUrl/courses/enrolled" `
    -Token $studentToken `
    -ExpectedStatus 200

# ============================
# 7. SECURITY TESTS
# ============================
Write-Host "`n========== SECURITY TESTS ==========" -ForegroundColor Yellow

# Test 32: Invalid JWT token
Test-Api -Name "Invalid JWT Token" -Method GET `
    -Url "$baseUrl/users/me" `
    -Token "invalid.token.here" `
    -ExpectedStatus 401

# Test 33: Missing required fields
Test-Api -Name "Missing Login Fields" -Method POST `
    -Url "$baseUrl/auth/login" `
    -Body "{}" `
    -ExpectedStatus 400

# Test 34: Deprecated endpoint (via API gateway port)
Test-Api -Name "Deprecated /quizzes Endpoint" -Method GET `
    -Url "http://localhost:3000/quizzes" `
    -ExpectedStatus 410

# ============================
# RESULTS
# ============================
Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "  TEST RESULTS" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  Total:  $total" -ForegroundColor White
Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor Red
$pct = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 1) } else { 0 }
Write-Host "  Rate:   $pct%" -ForegroundColor $(if ($pct -ge 90) { "Green" } elseif ($pct -ge 70) { "Yellow" } else { "Red" })
Write-Host "============================================" -ForegroundColor Magenta