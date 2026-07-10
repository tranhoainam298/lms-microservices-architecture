

const GATEWAY_URL = 'http://localhost:3000';
const PAYMENT_URL = 'http://localhost:3004';

async function e2eTest() {
  console.log('🚀 Starting Comprehensive E2E Testing of LMS Microservices...\n');

  try {
    // ---------------------------------------------------------
    // 1. SETUP DEMO ACCOUNTS
    // ---------------------------------------------------------
    console.log('--- 1. Setting up Test Accounts ---');
    const studentAuth = { email: `student_${Date.now()}@test.com`, password: 'password123', fullName: 'E2E Student', role: 'student' };
    const instructorAuth = { email: `instructor_${Date.now()}@test.com`, password: 'password123', fullName: 'E2E Instructor', role: 'instructor' };

    await fetch(`${GATEWAY_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentAuth) });
    await fetch(`${GATEWAY_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(instructorAuth) });

    const studentLogin = await fetch(`${GATEWAY_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: studentAuth.email, password: studentAuth.password, role: 'student' }) }).then(res => res.json());
    const instructorLogin = await fetch(`${GATEWAY_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: instructorAuth.email, password: instructorAuth.password, role: 'instructor' }) }).then(res => res.json());

    if (!studentLogin.accessToken || !instructorLogin.accessToken) {
      throw new Error('Authentication Failed for test accounts');
    }
    
    const studentToken = studentLogin.accessToken;
    const instructorToken = instructorLogin.accessToken;
    const studentId = studentLogin.userProfile.id;
    const instructorId = instructorLogin.userProfile.id;
    console.log(`✅ Accounts Created. Student ID: ${studentId}, Instructor ID: ${instructorId}\n`);

    // ---------------------------------------------------------
    // 2. INSTRUCTOR CREATES COURSE & LESSON
    // ---------------------------------------------------------
    console.log('--- 2. Course Creation Flow ---');
    let res = await fetch(`${GATEWAY_URL}/courses/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instructorToken}` },
      body: JSON.stringify({ title: 'E2E Architecture Course', description: 'Mastering microservices.', category: 'Engineering' })
    });
    const courseData = await res.json();
    const courseId = courseData.courseId;
    if (!courseId) throw new Error('Failed to create course: ' + JSON.stringify(courseData));
    console.log(`✅ Course Created (ID: ${courseId})`);

    res = await fetch(`${GATEWAY_URL}/courses/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instructorToken}` },
      body: JSON.stringify({ courseId, title: 'Introduction to Event-Driven Design', video_url: 'http://video.link', document_url: 'http://doc.link' })
    });
    const lessonData = await res.json();
    const lessonId = lessonData.lessonId;
    if (!lessonId) throw new Error('Failed to create lesson: ' + JSON.stringify(lessonData));
    console.log(`✅ Lesson Created (ID: ${lessonId})\n`);

    // ---------------------------------------------------------
    // 3. INSTRUCTOR CREATES QUIZ (EXAM SERVICE)
    // ---------------------------------------------------------
    console.log('--- 3. Exam Creation Flow ---');
    res = await fetch(`${GATEWAY_URL}/quizzes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instructorToken}` },
      body: JSON.stringify({ title: 'E2E Architecture Quiz', courseId, timeLimit: 30 })
    });
    if (!res.ok) throw new Error('Quiz creation failed: ' + await res.text());
    const quizData = await res.json();
    const quizId = quizData.id;
    console.log(`✅ Quiz Created (ID: ${quizId})`);

    res = await fetch(`${GATEWAY_URL}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instructorToken}` },
      body: JSON.stringify({ courseId, topic: 'RabbitMQ', content: 'What is a topic exchange?', options: '["A router","A DB","A cache"]', correctAnswer: 'A router' })
    });
    if (!res.ok) throw new Error('Question creation failed: ' + await res.text());
    const questionData = await res.json();
    console.log(`✅ Question added to Quiz (Question ID: ${questionData.questionId})\n`);

    // ---------------------------------------------------------
    // 4. STUDENT ATTEMPTS UNAUTHORIZED ACCESS
    // ---------------------------------------------------------
    console.log('--- 4. Enforcing Security ---');
    res = await fetch(`${GATEWAY_URL}/courses/lessons/${lessonId}`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    if (res.status === 403) {
      console.log(`✅ Student successfully blocked from accessing un-enrolled lesson (HTTP 403).\n`);
    } else {
      throw new Error(`Security Bypass! Expected 403 but got ${res.status}`);
    }

    // ---------------------------------------------------------
    // 5. PAYMENT & RABBITMQ ENROLLMENT
    // ---------------------------------------------------------
    console.log('--- 5. Payment & Event-Driven Enrollment ---');
    console.log('Sending webhook to Payment Service...');
    res = await fetch(`${PAYMENT_URL}/payments/webhook/zalopay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, courseId, transactionId: `TXN_${Date.now()}` })
    });
    console.log('Webhook Response:', await res.json());

    console.log('Waiting 3 seconds for RabbitMQ to deliver message and Course Service to process it...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ---------------------------------------------------------
    // 6. STUDENT ACCESSES LESSON (POST-ENROLLMENT)
    // ---------------------------------------------------------
    console.log('--- 6. Verifying Post-Enrollment Access ---');
    res = await fetch(`${GATEWAY_URL}/courses/lessons/${lessonId}`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    if (res.ok) {
      console.log(`✅ Student successfully accessed lesson after RabbitMQ enrollment.\n`);
    } else {
      throw new Error(`Enrollment failed or not processed! Expected 200 but got ${res.status}: ` + await res.text());
    }

    // ---------------------------------------------------------
    // 7. STUDENT TAKES QUIZ
    // ---------------------------------------------------------
    console.log('--- 7. Quiz Attempt Flow ---');
    const answerPayload = {
      studentId,
      answers: { [questionData.questionId]: 'A router' } // Correct answer
    };
    res = await fetch(`${GATEWAY_URL}/quizzes/${quizId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
      body: JSON.stringify(answerPayload)
    });
    if (!res.ok) throw new Error('Quiz submission failed: ' + await res.text());
    const resultData = await res.json();
    console.log(`✅ Quiz submitted successfully! Auto-Graded Score: ${resultData.score}%\n`);

    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! The architecture is sound.');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  }
}

e2eTest();
