const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');

const API_BASE = String(process.env.LMS_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');
const enabled = process.env.RUN_FINAL_ROLE_E2E === 'true';
const instructorToken = process.env.LMS_INSTRUCTOR_TOKEN;
const otherInstructorToken = process.env.LMS_OTHER_INSTRUCTOR_TOKEN;
const adminToken = process.env.LMS_ADMIN_TOKEN;
const unenrolledStudentToken = process.env.LMS_UNENROLLED_STUDENT_TOKEN;

let passed = 0;

function auth(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...auth(token),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, body: payload };
}

function expectStatus(result, expected, label) {
  assert.equal(result.status, expected, `${label}: expected HTTP ${expected}, received ${result.status}`);
}

async function check(label, callback) {
  await callback();
  passed += 1;
  console.log(`PASS  ${label}`);
}

function assertNoAnswerKey(value, path = 'response') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoAnswerKey(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[_-]/g, '');
    assert.ok(
      !['correctanswer', 'correctoptionindex', 'answerkey'].includes(normalized),
      `${path}.${key} exposes an answer key`
    );
    assertNoAnswerKey(nested, `${path}.${key}`);
  }
}

async function createStudentSession() {
  const suffix = `${Date.now()}-${randomBytes(4).toString('hex')}`;
  const email = `final-alignment-${suffix}@example.test`;
  const password = `F!nal-${randomBytes(12).toString('hex')}aA9`;
  let result = await request('/auth/register', {
    method: 'POST',
    body: { email, password, fullName: 'Final Alignment Student', role: 'student' }
  });
  expectStatus(result, 201, 'student registration');
  result = await request('/auth/login', {
    method: 'POST',
    body: { email, password, role: 'student' }
  });
  expectStatus(result, 200, 'student login');
  assert.equal(typeof result.body?.accessToken, 'string');
  return { token: result.body.accessToken, userId: result.body.userProfile.id, email };
}

async function main() {
  if (!enabled) {
    console.log('FINAL_ROLE_E2E_BLOCKED: set RUN_FINAL_ROLE_E2E=true with role tokens.');
    return;
  }
  for (const [name, value] of Object.entries({
    LMS_INSTRUCTOR_TOKEN: instructorToken,
    LMS_OTHER_INSTRUCTOR_TOKEN: otherInstructorToken,
    LMS_ADMIN_TOKEN: adminToken,
    LMS_UNENROLLED_STUDENT_TOKEN: unenrolledStudentToken
  })) {
    assert.ok(value, `${name} is required.`);
  }

  const student = await createStudentSession();
  await check('student registration/login uses the public Gateway route', async () => {
    const result = await request('/users/me', { token: student.token });
    expectStatus(result, 200, 'student profile');
    assert.equal(result.body?.user?.id, student.userId);
    assert.equal(result.body?.user?.role, 'student');
  });

  const suffix = `${Date.now()}-${randomBytes(3).toString('hex')}`;
  let result = await request('/courses/draft', {
    token: instructorToken,
    method: 'POST',
    body: {
      title: `Final alignment course ${suffix}`,
      description: 'A dedicated persistent runtime fixture created only through owning service APIs.',
      category: 'Architecture Verification',
      price: 0,
      lessons: [{
        title: 'Secure learning flow',
        content: 'This lesson verifies enrollment, learning progress, quiz access, and lesson-context AI authorization.',
        videoUrl: 'https://example.com/learning-video.mp4',
        documentUrl: 'https://example.com/learning-resource.pdf'
      }]
    }
  });
  expectStatus(result, 201, 'create draft');
  const courseId = result.body?.course?.id;
  const firstLessonId = result.body?.course?.lessons?.[0]?.id;
  assert.ok(Number.isSafeInteger(courseId) && Number.isSafeInteger(firstLessonId));

  await check('instructor owns and can update the dedicated draft', async () => {
    const update = await request(`/courses/drafts/${courseId}`, {
      token: instructorToken,
      method: 'PATCH',
      body: {
        title: `Final aligned LMS course ${suffix}`,
        description: 'Verified through the current secure runtime.',
        category: 'Runtime Verified',
        coverImage: 'https://example.com/course-cover.jpg',
        price: 0,
        instructorId: 2147483647,
        status: 'published'
      }
    });
    expectStatus(update, 200, 'update owned draft');
    assert.equal(update.body?.course?.status, 'draft');
  });

  await check('cross-instructor draft access is hidden', async () => {
    const update = await request(`/courses/drafts/${courseId}`, {
      token: otherInstructorToken,
      method: 'PATCH',
      body: {
        title: 'Forbidden update',
        description: 'A valid payload must still fail the ownership boundary.',
        category: 'Runtime Verified',
        coverImage: 'https://example.com/course-cover.jpg',
        price: 0
      }
    });
    expectStatus(update, 404, 'cross-instructor update');
  });

  result = await request(`/courses/drafts/${courseId}/lessons`, {
    token: instructorToken,
    method: 'POST',
    body: { title: 'Temporary reorder lesson', content: 'Temporary lesson used to verify authoring lifecycle.' }
  });
  expectStatus(result, 201, 'create second lesson');
  const secondLessonId = result.body?.lesson?.id;
  assert.ok(Number.isSafeInteger(secondLessonId));

  await check('lesson create/reorder/update/delete lifecycle is functional', async () => {
    let response = await request(`/courses/drafts/${courseId}/lessons/reorder`, {
      token: instructorToken,
      method: 'PATCH',
      body: { lessonIds: [secondLessonId, firstLessonId] }
    });
    expectStatus(response, 200, 'reorder lessons');
    response = await request(`/courses/drafts/${courseId}/lessons/${firstLessonId}`, {
      token: instructorToken,
      method: 'PATCH',
      body: {
        title: 'Secure learning flow',
        content: 'Updated lesson context persists in Course DB and remains protected by enrollment.',
        videoUrl: 'https://example.com/learning-video.mp4',
        documentUrl: 'https://example.com/learning-resource.pdf'
      }
    });
    expectStatus(response, 200, 'update lesson');
    response = await request(`/courses/drafts/${courseId}/lessons/${secondLessonId}`, {
      token: instructorToken,
      method: 'DELETE'
    });
    expectStatus(response, 200, 'delete lesson');
  });

  result = await request(`/exams/courses/${courseId}/quizzes`, {
    token: instructorToken,
    method: 'POST',
    body: {
      title: `Final secure quiz ${suffix}`,
      description: 'Server-graded runtime verification quiz.',
      durationMinutes: 15,
      passingScore: 50,
      questions: [
        {
          questionText: 'Which layer derives the student identity?',
          questionType: 'single_choice',
          options: ['Browser request body', 'Verified JWT'],
          correctOptionIndex: 1,
          points: 10
        },
        {
          questionText: 'Where is the quiz graded?',
          questionType: 'single_choice',
          options: ['On the server', 'In browser state'],
          correctOptionIndex: 0,
          points: 10
        }
      ]
    }
  });
  expectStatus(result, 201, 'create quiz');
  const quizId = result.body?.quiz?.id;
  assert.ok(Number.isSafeInteger(quizId));

  await check('quiz authoring enforces instructor course ownership', async () => {
    const response = await request(`/exams/courses/${courseId}/quizzes/mine`, {
      token: otherInstructorToken
    });
    expectStatus(response, 404, 'cross-instructor quiz list');
  });

  result = await request(`/exams/courses/${courseId}/quizzes/${quizId}/publish`, {
    token: instructorToken,
    method: 'PATCH'
  });
  expectStatus(result, 200, 'publish quiz');

  await check('published quiz on a draft course remains inaccessible', async () => {
    const response = await request(`/exams/quizzes/${quizId}`, { token: student.token });
    expectStatus(response, 403, 'draft-course quiz load');
    assert.equal(response.body?.code, 'COURSE_ACCESS_REQUIRED');
  });

  result = await request(`/courses/drafts/${courseId}/publish`, {
    token: instructorToken,
    method: 'PATCH'
  });
  expectStatus(result, 200, 'publish course');

  await check('unenrolled students cannot access lessons or quizzes', async () => {
    let response = await request(`/courses/lessons/${firstLessonId}`, { token: unenrolledStudentToken });
    expectStatus(response, 403, 'locked lesson');
    response = await request(`/exams/quizzes/${quizId}`, { token: unenrolledStudentToken });
    expectStatus(response, 403, 'locked quiz');
    assert.equal(response.body?.code, 'COURSE_ACCESS_REQUIRED');
  });

  result = await request(`/courses/${courseId}/enroll`, {
    token: student.token,
    method: 'POST',
    body: { studentId: 2147483647, status: 'active' }
  });
  expectStatus(result, 200, 'free course enrollment');
  assert.equal(result.body?.enrollment?.studentId, student.userId);

  await check('lesson access and progress use JWT identity and persist', async () => {
    let response = await request(`/courses/${courseId}/learning`, { token: student.token });
    expectStatus(response, 200, 'learning overview');
    assert.equal(response.body?.items?.length, 1);
    response = await request(`/courses/lessons/${firstLessonId}/complete`, {
      token: student.token,
      method: 'POST',
      body: { studentId: 2147483647, progressPercent: 0 }
    });
    expectStatus(response, 200, 'lesson completion');
    assert.deepEqual(response.body?.completedLessonIds, [firstLessonId]);
    response = await request(`/courses/${courseId}/learning`, { token: student.token });
    expectStatus(response, 200, 'persisted learning overview');
    assert.equal(response.body?.progress?.percent, 100);
    assert.ok(response.body?.completedLessonIds?.includes(firstLessonId));
  });

  await check('AI lesson support enforces access and reports missing provider configuration honestly', async () => {
    let response = await request(`/courses/lessons/${firstLessonId}/ai/ask`, {
      token: unenrolledStudentToken,
      method: 'POST',
      body: { question: 'Summarize this lesson.' }
    });
    expectStatus(response, 403, 'locked AI support');
    response = await request(`/courses/lessons/${firstLessonId}/ai/ask`, {
      token: student.token,
      method: 'POST',
      body: { question: 'Summarize this lesson.', studentId: 2147483647 }
    });
    assert.ok([200, 503].includes(response.status), `AI endpoint returned unexpected HTTP ${response.status}`);
    if (response.status === 503) assert.equal(response.body?.code, 'AI_PROVIDER_NOT_CONFIGURED');
    if (response.status === 200) assert.ok(String(response.body?.answer || '').trim());
  });

  let loadedQuiz;
  await check('enrolled student loads questions without answer keys', async () => {
    const response = await request(`/exams/quizzes/${quizId}`, { token: student.token });
    expectStatus(response, 200, 'quiz load');
    assertNoAnswerKey(response.body);
    loadedQuiz = response.body?.quiz;
    assert.equal(loadedQuiz?.questions?.length, 2);
  });

  let quizResult;
  await check('Exam Service grades and persists a result server-side', async () => {
    const answers = loadedQuiz.questions.map(question => ({
      questionId: question.id,
      selectedOptionIndex: question.questionText.includes('identity') ? 1 : 0
    }));
    const response = await request(`/exams/quizzes/${quizId}/submit`, {
      token: student.token,
      method: 'POST',
      body: {
        answers,
        studentId: 2147483647,
        score: 0,
        maximumScore: 9999,
        percentage: 0,
        passed: false
      }
    });
    expectStatus(response, 201, 'quiz submit');
    quizResult = response.body?.result;
    assert.equal(quizResult?.studentId, student.userId);
    assert.equal(Number(quizResult?.score), 20);
    assert.equal(Number(quizResult?.maximumScore), 20);
    assert.equal(Number(quizResult?.percentage), 100);
    assert.equal(quizResult?.passed, true);
    assertNoAnswerKey(response.body);
  });

  await check('quiz result is retrievable and duplicate submission is rejected', async () => {
    let response = await request(`/exams/results/${quizResult.id}`, { token: student.token });
    expectStatus(response, 200, 'result detail');
    assert.equal(response.body?.result?.id, quizResult.id);
    response = await request(`/exams/quizzes/${quizId}/submit`, {
      token: student.token,
      method: 'POST',
      body: { answers: loadedQuiz.questions.map(question => ({ questionId: question.id, selectedOptionIndex: 0 })) }
    });
    expectStatus(response, 409, 'duplicate quiz submit');
    assert.equal(response.body?.code, 'QUIZ_ALREADY_SUBMITTED');
  });

  await check('instructor monitoring returns owned progress and quiz results', async () => {
    let response = await request(`/courses/instructor/${courseId}/progress`, { token: instructorToken });
    expectStatus(response, 200, 'instructor progress');
    assert.ok(response.body?.items?.some(item => item.studentId === student.userId));
    response = await request(`/exams/courses/${courseId}/results/summary`, { token: instructorToken });
    expectStatus(response, 200, 'instructor quiz summary');
    assert.equal(response.body?.summary?.attemptCount, 1);
  });

  await check('revenue report RBAC and calculations are consistent', async () => {
    expectStatus(await request('/payments/reports/revenue'), 401, 'missing-token revenue');
    expectStatus(await request('/payments/reports/revenue', { token: 'invalid-token' }), 401, 'invalid-token revenue');
    expectStatus(await request('/payments/reports/revenue', { token: student.token }), 403, 'student revenue');
    expectStatus(await request('/payments/reports/revenue', { token: instructorToken }), 403, 'instructor revenue');
    const response = await request('/payments/reports/revenue', { token: adminToken });
    expectStatus(response, 200, 'admin revenue');
    const successful = response.body.transactions.filter(item => item.status === 'success');
    const calculatedRevenue = successful.reduce((sum, item) => sum + Number(item.amount), 0);
    assert.equal(response.body.summary.successfulTransactions, successful.length);
    assert.equal(response.body.summary.totalTransactions, response.body.transactions.length);
    assert.equal(Number(response.body.summary.totalRevenue), calculatedRevenue);
  });

  await check('admin course category/report and user/activity operations are live', async () => {
    let response = await request(`/courses/admin/${courseId}/category`, {
      token: adminToken,
      method: 'PATCH',
      body: { category: 'Final Runtime Verification' }
    });
    expectStatus(response, 200, 'admin category update');
    assert.equal(response.body?.course?.category, 'Final Runtime Verification');
    response = await request('/courses/admin/reports/courses', { token: adminToken });
    expectStatus(response, 200, 'admin course report');
    assert.ok(response.body?.items?.some(item => item.id === courseId));
    response = await request(`/users/admin/users?search=${encodeURIComponent(student.email)}&pageSize=100`, { token: adminToken });
    expectStatus(response, 200, 'admin user list');
    assert.ok(response.body?.items?.some(item => item.id === student.userId));
    response = await request('/users/admin/reports/activity', { token: adminToken });
    expectStatus(response, 200, 'admin activity report');
  });

  result = await request('/courses/draft', {
    token: instructorToken,
    method: 'POST',
    body: {
      title: `Deletion lifecycle ${suffix}`,
      description: 'Dedicated deletion-state verification fixture.',
      category: 'Verification',
      price: 0
    }
  });
  expectStatus(result, 201, 'create deletion draft');
  const deletionCourseId = result.body.course.id;
  await check('owned unused draft uses safe soft deletion', async () => {
    const response = await request(`/courses/drafts/${deletionCourseId}`, {
      token: instructorToken,
      method: 'DELETE'
    });
    expectStatus(response, 200, 'delete draft');
    assert.equal(response.body?.deleted, true);
  });

  console.log(`FINAL_ROLE_E2E_PASS checks=${passed} courseId=${courseId} quizId=${quizId} resultId=${quizResult.id}`);
}

main().catch(error => {
  console.error(`FINAL_ROLE_E2E_FAIL: ${error.message}`);
  process.exitCode = 1;
});
