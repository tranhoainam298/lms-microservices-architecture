const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');

const enabled = process.env.RUN_BUSINESS_CRUD_E2E === 'true';

if (!enabled) {
  console.log('BUSINESS_CRUD_RUNTIME_BLOCKED: set RUN_BUSINESS_CRUD_E2E=true and LMS_DEMO_PASSWORD.');
  process.exit(0);
}

const API_BASE = String(process.env.LMS_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');
const demoPassword = process.env.LMS_DEMO_PASSWORD;

assert.ok(demoPassword, 'LMS_DEMO_PASSWORD is required and is never printed by this test.');

const accounts = {
  student: {
    email: process.env.LMS_DEMO_STUDENT_EMAIL || 'student1@lms.demo',
    role: 'student'
  },
  otherStudent: {
    email: process.env.LMS_DEMO_OTHER_STUDENT_EMAIL || 'student2@lms.demo',
    role: 'student'
  },
  instructor: {
    email: process.env.LMS_DEMO_INSTRUCTOR_EMAIL || 'instructor1@lms.demo',
    role: 'instructor'
  },
  otherInstructor: {
    email: process.env.LMS_DEMO_OTHER_INSTRUCTOR_EMAIL || 'instructor2@lms.demo',
    role: 'instructor'
  },
  admin: {
    email: process.env.LMS_DEMO_ADMIN_EMAIL || 'admin@lms.demo',
    role: 'admin'
  }
};

let passed = 0;

function authorization(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { token, method = 'GET', body } = {}) {
  const headers = {
    ...authorization(token),
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
  };
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    signal: AbortSignal.timeout(30000),
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { status: response.status, body: payload };
}

function expectStatus(result, expected, label) {
  assert.equal(result.status, expected, `${label}: expected HTTP ${expected}, received ${result.status}`);
}

function positive(value, label) {
  const number = Number(value);
  assert.ok(Number.isFinite(number) && number > 0, `${label} must be greater than zero; received ${value}`);
  return number;
}

function positiveId(value, label) {
  const id = Number(value);
  assert.ok(Number.isSafeInteger(id) && id > 0, `${label} must be a positive integer`);
  return id;
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

async function check(label, callback) {
  await callback();
  passed += 1;
  console.log(`PASS  ${label}`);
}

async function login(account) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: { email: account.email, password: account.password || demoPassword, role: account.role }
  });
  expectStatus(result, 200, `${account.role} login`);
  assert.equal(typeof result.body?.accessToken, 'string', `${account.role} login must return a token`);
  positiveId(result.body?.userProfile?.id, `${account.role} user ID`);
  return {
    token: result.body.accessToken,
    id: Number(result.body.userProfile.id),
    role: result.body.userProfile.role
  };
}

async function main() {
  const sessions = {};
  await check('demo role accounts authenticate through Nginx and the Gateway', async () => {
    for (const [name, account] of Object.entries(accounts)) {
      sessions[name] = await login(account);
    }
  });

  let catalog;
  await check('student catalog exposes seeded published free and paid courses', async () => {
    let result = await request('/courses');
    expectStatus(result, 200, 'published catalog');
    assert.ok(Array.isArray(result.body), 'catalog must be an array');
    positive(result.body.length, 'published catalog count');
    assert.ok(result.body.every(course => course.status === 'published'), 'public catalog must exclude drafts');
    assert.ok(result.body.some(course => Number(course.price) === 0), 'catalog must include a free course');
    assert.ok(result.body.some(course => Number(course.price) > 0), 'catalog must include a paid course');
    catalog = result.body;

    result = await request('/courses?search=Python&category=Programming&priceType=free');
    expectStatus(result, 200, 'filtered free catalog');
    positive(result.body?.length, 'filtered free catalog count');
    assert.ok(result.body.every(course => Number(course.price) === 0 && course.status === 'published'));

    result = await request('/courses?priceType=paid');
    expectStatus(result, 200, 'filtered paid catalog');
    positive(result.body?.length, 'filtered paid catalog count');
    assert.ok(result.body.every(course => Number(course.price) > 0 && course.status === 'published'));
  });

  let studentEnrollments;
  await check('student dashboard APIs expose seeded enrollment and progress data', async () => {
    const result = await request('/courses/enrolled', { token: sessions.student.token });
    expectStatus(result, 200, 'student enrollments');
    assert.ok(Array.isArray(result.body), 'enrolled courses must be an array');
    positive(result.body.length, 'student enrolled course count');
    positive(result.body.reduce((sum, course) => sum + Number(course.progress_percent || 0), 0), 'student progress total');
    positive(result.body.reduce((sum, course) => sum + Number(course.completed_lessons || 0), 0), 'student completed lesson count');
    assert.ok(result.body.every(course => Number(course.total_lessons) > 0), 'each seeded enrollment must have lessons');
    studentEnrollments = result.body;
  });

  let studentResults;
  await check('student dashboard API exposes seeded quiz history', async () => {
    const result = await request('/exams/results/mine', { token: sessions.student.token });
    expectStatus(result, 200, 'student quiz results');
    assert.ok(Array.isArray(result.body?.items), 'quiz results must contain items');
    positive(result.body?.summary?.totalAttempts, 'student quiz attempts');
    positive(result.body?.summary?.averagePercentage, 'student average quiz percentage');
    positive(result.body.items.length, 'student recent quiz result rows');
    studentResults = result.body.items;
  });

  await check('student learning data and completion are persisted and idempotent', async () => {
    const enrollment = studentEnrollments.find(course => Number(course.completed_lessons) > 0);
    assert.ok(enrollment, 'seeded student needs an enrollment with completed lessons');
    const courseId = positiveId(enrollment.id, 'learning course ID');
    let result = await request(`/courses/${courseId}/learning`, { token: sessions.student.token });
    expectStatus(result, 200, 'student learning overview');
    positive(result.body?.items?.length, 'learning lesson count');
    positive(result.body?.completedLessonIds?.length, 'persisted completed lesson count');
    const lessonId = positiveId(result.body.completedLessonIds[0], 'completed lesson ID');
    const progressBefore = result.body.progress;

    result = await request(`/courses/lessons/${lessonId}/complete`, {
      token: sessions.student.token,
      method: 'POST',
      body: { studentId: sessions.otherStudent.id, progressPercent: 0 }
    });
    expectStatus(result, 200, 'idempotent lesson completion');
    assert.equal(result.body?.courseId, courseId);
    assert.equal(result.body?.progress?.completedLessons, progressBefore.completedLessons);
    assert.equal(result.body?.progress?.percent, progressBefore.percent);
  });

  await check('student quiz payload hides answer keys and result ownership is enforced', async () => {
    const accessibleCourse = studentEnrollments.find(course => Number(course.id) === 20001) || studentEnrollments[0];
    let result = await request(`/exams/courses/${accessibleCourse.id}/quizzes`, { token: sessions.student.token });
    expectStatus(result, 200, 'published quizzes for enrolled course');
    positive(result.body?.items?.length, 'accessible published quiz count');
    const quizId = positiveId(result.body.items[0].id, 'accessible quiz ID');
    result = await request(`/exams/quizzes/${quizId}`, { token: sessions.student.token });
    expectStatus(result, 200, 'student quiz load');
    positive(result.body?.quiz?.questions?.length, 'quiz question count');
    assertNoAnswerKey(result.body);

    const resultId = positiveId(studentResults[0]?.id, 'student result ID');
    result = await request(`/exams/results/${resultId}`, { token: sessions.otherStudent.token });
    expectStatus(result, 404, 'cross-student result access');
  });

  await check('student profile lifecycle and complete seeded quiz submission persist through public APIs', async () => {
    const quizFlowSuffix = `${Date.now()}-${randomBytes(4).toString('hex')}`;
    const quizStudentAccount = {
      email: `quiz-flow-${quizFlowSuffix}@example.test`,
      password: `Runtime-${randomBytes(12).toString('hex')}aA9`,
      role: 'student'
    };

    let result = await request('/auth/register', {
      method: 'POST',
      body: {
        email: quizStudentAccount.email,
        password: quizStudentAccount.password,
        fullName: 'Quiz Flow Verification Student',
        role: quizStudentAccount.role
      }
    });
    expectStatus(result, 201, 'register quiz-flow student');
    let quizStudent = await login(quizStudentAccount);

    result = await request('/users/me', { token: quizStudent.token });
    expectStatus(result, 200, 'quiz-flow profile read');
    assert.equal(result.body?.user?.email, quizStudentAccount.email);

    result = await request('/users/me', {
      token: quizStudent.token,
      method: 'PATCH',
      body: { fullName: 'Quiz Flow Verification Student Updated' }
    });
    expectStatus(result, 200, 'quiz-flow profile update');
    assert.equal(result.body?.user?.fullName, 'Quiz Flow Verification Student Updated');

    const updatedPassword = `Runtime-${randomBytes(12).toString('hex')}bB8`;
    result = await request('/users/me/password', {
      token: quizStudent.token,
      method: 'PATCH',
      body: { currentPassword: quizStudentAccount.password, newPassword: updatedPassword }
    });
    expectStatus(result, 200, 'quiz-flow password change');
    assert.equal(result.body?.changed, true);
    quizStudentAccount.password = updatedPassword;
    quizStudent = await login(quizStudentAccount);

    result = await request('/courses/20001/enroll', {
      token: quizStudent.token,
      method: 'POST'
    });
    expectStatus(result, 200, 'enroll quiz-flow student in seeded free course');

    result = await request('/exams/courses/20001/quizzes', { token: quizStudent.token });
    expectStatus(result, 200, 'load seeded quizzes for quiz-flow student');
    const seededQuizId = positiveId(result.body?.items?.[0]?.id, 'seeded quiz ID');

    result = await request(`/exams/quizzes/${seededQuizId}`, { token: quizStudent.token });
    expectStatus(result, 200, 'load seeded quiz for submission');
    const questions = result.body?.quiz?.questions || [];
    assert.ok(questions.length > 1, 'the seeded quiz must contain multiple questions');
    assertNoAnswerKey(result.body);

    result = await request('/exams/results/mine', { token: quizStudent.token });
    expectStatus(result, 200, 'quiz-flow result history before submission');
    assert.equal(result.body?.total, 0, 'the new student must begin without an attempt');

    const answers = questions.map(question => ({
      questionId: positiveId(question.id, 'seeded question ID'),
      selectedOptionIndex: 0
    }));
    result = await request(`/exams/quizzes/${seededQuizId}/submit`, {
      token: quizStudent.token,
      method: 'POST',
      body: { answers: answers.slice(0, -1) }
    });
    expectStatus(result, 400, 'incomplete quiz submission');
    assert.equal(result.body?.code, 'VALIDATION_ERROR');

    result = await request('/exams/results/mine', { token: quizStudent.token });
    expectStatus(result, 200, 'quiz-flow result history after incomplete submission');
    assert.equal(result.body?.total, 0, 'an incomplete submission must not consume an attempt');

    result = await request(`/exams/quizzes/${seededQuizId}/submit`, {
      token: quizStudent.token,
      method: 'POST',
      body: { answers }
    });
    expectStatus(result, 201, 'complete seeded quiz submission');
    const savedResultId = positiveId(result.body?.result?.id, 'saved quiz result ID');
    assert.equal(Number(result.body?.result?.studentId), quizStudent.id);
    assert.equal(Number(result.body?.result?.quizId), seededQuizId);
    positive(result.body?.result?.maximumScore, 'saved quiz maximum score');

    result = await request('/exams/results/mine', { token: quizStudent.token });
    expectStatus(result, 200, 'quiz-flow result history after complete submission');
    assert.equal(result.body?.total, 1, 'the complete submission must create one result');
    assert.ok(result.body?.items?.some(item => Number(item.id) === savedResultId));

    result = await request(`/exams/results/${savedResultId}`, { token: quizStudent.token });
    expectStatus(result, 200, 'quiz-flow student reads own persisted result');
    assert.equal(Number(result.body?.result?.studentId), quizStudent.id);

    result = await request(`/exams/quizzes/${seededQuizId}/submit`, {
      token: quizStudent.token,
      method: 'POST',
      body: { answers }
    });
    expectStatus(result, 409, 'duplicate seeded quiz submission');
  });

  let instructorCourses;
  await check('instructor dashboard APIs expose seeded course and learner metrics', async () => {
    let result = await request('/courses/instructor/mine', { token: sessions.instructor.token });
    expectStatus(result, 200, 'instructor course dashboard');
    positive(result.body?.summary?.totalCourses, 'instructor owned course count');
    positive(result.body?.summary?.publishedCourses, 'instructor published course count');
    positive(result.body?.summary?.draftCourses, 'instructor draft course count');
    positive(result.body?.summary?.uniqueStudents, 'instructor enrolled student count');
    positive(result.body?.summary?.averageProgress, 'instructor average progress');
    assert.ok(Array.isArray(result.body?.items) && result.body.items.length > 0);
    instructorCourses = result.body.items;

    const seededCourse = instructorCourses.find(course => Number(course.activeEnrollmentCount) > 0);
    assert.ok(seededCourse, 'instructor needs a seeded course with active enrollments');
    result = await request(`/courses/instructor/${seededCourse.id}/progress`, { token: sessions.instructor.token });
    expectStatus(result, 200, 'instructor learner progress');
    positive(result.body?.summary?.activeEnrollments, 'owned-course active enrollments');
    positive(result.body?.items?.length, 'owned-course progress rows');
  });

  await check('instructor dashboard API exposes seeded quiz result metrics', async () => {
    const result = await request('/exams/instructor/results/summary', { token: sessions.instructor.token });
    expectStatus(result, 200, 'instructor quiz summary');
    positive(result.body?.summary?.quizCount, 'instructor quiz count');
    positive(result.body?.summary?.publishedQuizCount, 'instructor published quiz count');
    positive(result.body?.summary?.attemptCount, 'instructor quiz attempt count');
    positive(result.body?.summary?.averagePercentage, 'instructor average quiz percentage');
    positive(result.body?.recentResults?.length, 'instructor recent quiz result rows');
  });

  await check('admin dashboard APIs expose seeded user, course, revenue, and activity metrics', async () => {
    let result = await request('/users/admin/users?pageSize=100', { token: sessions.admin.token });
    expectStatus(result, 200, 'admin users');
    for (const [field, label] of [
      ['totalUsers', 'total users'],
      ['students', 'students'],
      ['instructors', 'instructors'],
      ['admins', 'admins'],
      ['activeUsers', 'active users'],
      ['inactiveUsers', 'inactive users']
    ]) positive(result.body?.summary?.[field], `admin ${label}`);
    positive(result.body?.items?.length, 'admin user rows');

    result = await request('/courses/admin/reports/courses', { token: sessions.admin.token });
    expectStatus(result, 200, 'admin course report');
    positive(result.body?.summary?.totalCourses, 'admin total courses');
    positive(result.body?.summary?.publishedCourses, 'admin published courses');
    positive(result.body?.summary?.draftCourses, 'admin draft courses');
    positive(result.body?.items?.length, 'admin course rows');

    result = await request('/payments/reports/revenue', { token: sessions.admin.token });
    expectStatus(result, 200, 'admin revenue report');
    positive(result.body?.summary?.successfulTransactions, 'admin successful payment count');
    positive(result.body?.summary?.totalRevenue, 'admin total revenue');
    positive(result.body?.transactions?.length, 'admin payment rows');
    const successful = result.body.transactions.filter(transaction => transaction.status === 'success');
    const calculatedRevenue = successful.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    assert.equal(result.body.summary.successfulTransactions, successful.length);
    assert.equal(Number(result.body.summary.totalRevenue), calculatedRevenue);

    result = await request('/users/admin/reports/activity?pageSize=100', { token: sessions.admin.token });
    expectStatus(result, 200, 'admin login activity');
    positive(result.body?.summary?.totalAttempts, 'admin login attempts');
    positive(result.body?.summary?.successfulLogins, 'admin successful logins');
    positive(result.body?.summary?.failedLogins, 'admin failed logins');
    positive(result.body?.items?.length, 'admin activity rows');
  });

  await check('role and token boundaries reject unauthorized dashboard access', async () => {
    expectStatus(await request('/courses/enrolled'), 401, 'missing-token enrollments');
    expectStatus(await request('/courses/instructor/mine', { token: sessions.student.token }), 403, 'student instructor dashboard');
    expectStatus(await request('/users/admin/users', { token: sessions.instructor.token }), 403, 'instructor admin users');
    expectStatus(await request('/payments/reports/revenue', { token: sessions.student.token }), 403, 'student revenue report');
  });

  const suffix = `${Date.now()}-${randomBytes(4).toString('hex')}`;
  let courseId;
  let lessonId;
  let quizId;

  await check('instructor creates, reads, and updates an owned draft while cross-owner update is hidden', async () => {
    let result = await request('/courses/draft', {
      token: sessions.instructor.token,
      method: 'POST',
      body: {
        title: `Business CRUD course ${suffix}`,
        description: 'A runtime-owned draft used to verify real authoring operations through the public API.',
        category: 'Software Engineering',
        price: 15.5
      }
    });
    expectStatus(result, 201, 'create owned draft');
    courseId = positiveId(result.body?.course?.id, 'created course ID');

    result = await request('/courses/instructor/mine', { token: sessions.instructor.token });
    expectStatus(result, 200, 'read own course list');
    assert.ok(result.body?.items?.some(course => course.id === courseId && course.status === 'draft'));

    result = await request(`/courses/drafts/${courseId}`, {
      token: sessions.instructor.token,
      method: 'PATCH',
      body: {
        title: `Business CRUD updated ${suffix}`,
        description: 'The updated draft remains owned by the authenticated instructor.',
        category: 'Programming',
        coverImage: 'https://placehold.co/1200x675?text=Business+CRUD',
        price: 18.75,
        instructorId: sessions.otherInstructor.id,
        status: 'published'
      }
    });
    expectStatus(result, 200, 'update owned draft');
    assert.equal(result.body?.course?.status, 'draft');
    assert.equal(result.body?.course?.instructorId, sessions.instructor.id);
    assert.equal(Number(result.body?.course?.price), 18.75);

    result = await request(`/courses/drafts/${courseId}`, {
      token: sessions.otherInstructor.token,
      method: 'PATCH',
      body: {
        title: 'Cross-owner update must fail',
        description: 'A complete payload must still fail ownership enforcement.',
        category: 'Programming',
        price: 1
      }
    });
    expectStatus(result, 404, 'cross-instructor draft update');
  });

  await check('instructor creates, reads, updates, and deletes only the temporary lesson', async () => {
    let result = await request(`/courses/drafts/${courseId}/lessons`, {
      token: sessions.instructor.token,
      method: 'POST',
      body: {
        title: 'Persistent publishable lesson',
        content: 'This lesson keeps the runtime verification course publishable.'
      }
    });
    expectStatus(result, 201, 'create persistent lesson');
    lessonId = positiveId(result.body?.lesson?.id, 'persistent lesson ID');

    result = await request(`/courses/drafts/${courseId}/lessons`, {
      token: sessions.instructor.token,
      method: 'POST',
      body: {
        title: 'Temporary CRUD lesson',
        content: 'This exact temporary lesson is updated and then deleted.',
        documentUrl: 'https://developer.mozilla.org/en-US/docs/Learn'
      }
    });
    expectStatus(result, 201, 'create temporary lesson');
    const temporaryLessonId = positiveId(result.body?.lesson?.id, 'temporary lesson ID');

    result = await request(`/courses/drafts/${courseId}/lessons/${temporaryLessonId}`, {
      token: sessions.instructor.token,
      method: 'PATCH',
      body: {
        title: 'Temporary CRUD lesson updated',
        content: 'The exact temporary row was updated before deletion.',
        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
      }
    });
    expectStatus(result, 200, 'update temporary lesson');
    assert.equal(result.body?.lesson?.title, 'Temporary CRUD lesson updated');

    result = await request(`/courses/drafts/${courseId}/lessons`, { token: sessions.instructor.token });
    expectStatus(result, 200, 'read draft lessons');
    assert.ok(result.body?.items?.some(lesson => lesson.id === temporaryLessonId));

    result = await request(`/courses/drafts/${courseId}/lessons/${temporaryLessonId}`, {
      token: sessions.instructor.token,
      method: 'DELETE'
    });
    expectStatus(result, 200, 'delete temporary lesson');
    assert.equal(result.body?.deleted, true);

    result = await request(`/courses/drafts/${courseId}/lessons`, { token: sessions.instructor.token });
    expectStatus(result, 200, 'verify temporary lesson deletion');
    assert.ok(result.body?.items?.some(lesson => lesson.id === lessonId));
    assert.ok(!result.body?.items?.some(lesson => lesson.id === temporaryLessonId));
  });

  await check('instructor quiz and explicit question CRUD persist through the public API', async () => {
    const initialQuestion = {
      questionText: 'Where is authoritative LMS business state stored?',
      questionType: 'single_choice',
      options: ['Only in browser state', 'In the owning backend database'],
      correctOptionIndex: 1,
      points: 10
    };
    let result = await request(`/exams/courses/${courseId}/quizzes`, {
      token: sessions.instructor.token,
      method: 'POST',
      body: {
        title: `Business CRUD quiz ${suffix}`,
        description: 'A real server-owned draft quiz for the runtime CRUD harness.',
        durationMinutes: 20,
        passingScore: 60,
        questions: [initialQuestion]
      }
    });
    expectStatus(result, 201, 'create draft quiz');
    quizId = positiveId(result.body?.quiz?.id, 'created quiz ID');

    result = await request(`/exams/courses/${courseId}/quizzes/${quizId}`, {
      token: sessions.instructor.token,
      method: 'PATCH',
      body: {
        title: `Business CRUD quiz updated ${suffix}`,
        description: 'The draft quiz metadata and server-side answer key were updated.',
        durationMinutes: 25,
        passingScore: 70,
        questions: [initialQuestion]
      }
    });
    expectStatus(result, 200, 'update draft quiz');
    assert.equal(result.body?.quiz?.status, 'draft');

    const temporaryQuestion = {
      questionText: 'Which identity source is authoritative for a student request?',
      questionType: 'single_choice',
      options: ['A client-supplied studentId', 'The verified JWT'],
      correctOptionIndex: 1,
      points: 10
    };
    result = await request(`/exams/courses/${courseId}/quizzes/${quizId}/questions`, {
      token: sessions.instructor.token,
      method: 'POST',
      body: temporaryQuestion
    });
    expectStatus(result, 201, 'create explicit question');
    const questionId = positiveId(result.body?.question?.id, 'created question ID');

    result = await request(`/exams/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`, {
      token: sessions.instructor.token
    });
    expectStatus(result, 200, 'read explicit question');
    assert.equal(result.body?.question?.correctOptionIndex, 1);

    result = await request(`/exams/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`, {
      token: sessions.instructor.token,
      method: 'PATCH',
      body: {
        ...temporaryQuestion,
        questionText: 'Which verified identity source must protected student operations use?',
        points: 15
      }
    });
    expectStatus(result, 200, 'update explicit question');
    assert.equal(Number(result.body?.question?.points), 15);

    result = await request(`/exams/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`, {
      token: sessions.instructor.token,
      method: 'DELETE'
    });
    expectStatus(result, 200, 'delete explicit question');
    assert.equal(result.body?.deleted, true);

    result = await request(`/exams/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`, {
      token: sessions.instructor.token
    });
    expectStatus(result, 404, 'verify explicit question deletion');
  });

  await check('publish rules prevent deleting published quiz and course through draft routes', async () => {
    let result = await request(`/exams/courses/${courseId}/quizzes/${quizId}/publish`, {
      token: sessions.instructor.token,
      method: 'PATCH'
    });
    expectStatus(result, 200, 'publish quiz');
    assert.equal(result.body?.quiz?.status, 'published');

    result = await request(`/exams/courses/${courseId}/quizzes/${quizId}`, {
      token: sessions.instructor.token,
      method: 'DELETE'
    });
    expectStatus(result, 404, 'delete published quiz');

    result = await request(`/courses/drafts/${courseId}/publish`, {
      token: sessions.instructor.token,
      method: 'PATCH'
    });
    expectStatus(result, 200, 'publish course');
    assert.equal(result.body?.course?.status, 'published');

    result = await request(`/courses/drafts/${courseId}`, {
      token: sessions.instructor.token,
      method: 'DELETE'
    });
    expectStatus(result, 404, 'delete published course');
  });

  await check('locked paid course content rejects an unenrolled student without a payment or AI call', async () => {
    let result = await request(`/courses/lessons/${lessonId}`, { token: sessions.student.token });
    expectStatus(result, 403, 'locked paid lesson');
    assert.equal(result.body?.code, 'COURSE_ACCESS_REQUIRED');
    result = await request(`/courses/lessons/${lessonId}/complete`, {
      token: sessions.student.token,
      method: 'POST',
      body: { studentId: sessions.student.id }
    });
    expectStatus(result, 403, 'locked paid lesson completion');
    result = await request(`/exams/quizzes/${quizId}`, { token: sessions.student.token });
    expectStatus(result, 403, 'locked paid quiz');
  });

  let temporaryUserId;
  await check('admin safely changes and restores a unique temporary account status and role', async () => {
    const email = `business-crud-${suffix}@example.test`;
    const password = `Runtime-${randomBytes(12).toString('hex')}aA9`;
    let result = await request('/auth/register', {
      method: 'POST',
      body: { email, password, fullName: 'Business CRUD Temporary Student', role: 'student' }
    });
    expectStatus(result, 201, 'register temporary student');
    temporaryUserId = positiveId(result.body?.user?.id, 'temporary user ID');

    result = await request(`/users/admin/users/${temporaryUserId}/status`, {
      token: sessions.admin.token,
      method: 'PATCH',
      body: { status: 'inactive' }
    });
    expectStatus(result, 200, 'deactivate temporary student');
    assert.equal(result.body?.user?.status, 'inactive');

    result = await request(`/users/admin/users/${temporaryUserId}/status`, {
      token: sessions.admin.token,
      method: 'PATCH',
      body: { status: 'active' }
    });
    expectStatus(result, 200, 'reactivate temporary student');

    result = await request(`/users/admin/users/${temporaryUserId}/role`, {
      token: sessions.admin.token,
      method: 'PATCH',
      body: { role: 'instructor' }
    });
    expectStatus(result, 200, 'promote temporary student');
    assert.equal(result.body?.user?.role, 'instructor');

    result = await request(`/users/admin/users/${temporaryUserId}/role`, {
      token: sessions.admin.token,
      method: 'PATCH',
      body: { role: 'student' }
    });
    expectStatus(result, 200, 'restore temporary student role');
    assert.equal(result.body?.user?.role, 'student');
    assert.equal(result.body?.user?.status, 'active');
  });

  let deletionCourseId;
  await check('instructor safely soft-deletes only an unused owned draft', async () => {
    let result = await request('/courses/draft', {
      token: sessions.instructor.token,
      method: 'POST',
      body: {
        title: `Business CRUD deletion draft ${suffix}`,
        description: 'This exact empty draft exists only to verify safe draft deletion.',
        category: 'Software Engineering',
        price: 0
      }
    });
    expectStatus(result, 201, 'create deletion draft');
    deletionCourseId = positiveId(result.body?.course?.id, 'deletion draft ID');

    result = await request(`/courses/drafts/${deletionCourseId}`, {
      token: sessions.instructor.token,
      method: 'DELETE'
    });
    expectStatus(result, 200, 'soft-delete unused draft');
    assert.equal(result.body?.deleted, true);

    result = await request('/courses/instructor/mine', { token: sessions.instructor.token });
    expectStatus(result, 200, 'verify deleted draft hidden');
    assert.ok(!result.body?.items?.some(course => course.id === deletionCourseId));
  });

  assert.ok(catalog.some(course => Number(course.id) === 20001), 'deterministic seed course is missing');
  console.log(
    `BUSINESS_CRUD_RUNTIME_PASS checks=${passed} courseId=${courseId} lessonId=${lessonId} quizId=${quizId} temporaryUserId=${temporaryUserId} deletionCourseId=${deletionCourseId}`
  );
}

main().catch(error => {
  console.error(`BUSINESS_CRUD_RUNTIME_FAIL: ${error.message}`);
  process.exitCode = 1;
});
