const assert = require('node:assert/strict');

const API_BASE_URL = String(process.env.LMS_PUBLIC_API || 'http://localhost:8080/api').replace(/\/$/, '');
const configuredQuizId = String(process.env.LMS_ENROLLED_QUIZ_ID || '').trim();
const routeQuizId = /^[1-9]\d*$/.test(configuredQuizId) ? configuredQuizId : '1';

let passed = 0;
let failed = 0;
let blocked = 0;

class BlockedTest extends Error {}

async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  let body = options.body;
  if (body !== undefined && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, body });
  return { response, body: await readBody(response) };
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

function expectStatus(response, expected, label) {
  assert.equal(response.status, expected, `${label}: expected HTTP ${expected}, received ${response.status}`);
}

async function test(name, callback) {
  try {
    await callback();
    passed += 1;
    console.log(`PASS    ${name}`);
    return true;
  } catch (error) {
    if (error instanceof BlockedTest) {
      block(name, error.message);
      return false;
    }
    failed += 1;
    console.error(`FAIL    ${name}: ${error.message}`);
    return false;
  }
}

function block(name, reason) {
  blocked += 1;
  console.log(`BLOCKED ${name}: ${reason}`);
}

function assertNoAnswerKey(value, path = 'quiz') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoAnswerKey(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase().replace(/[_-]/g, '');
    assert.ok(
      !['correctanswer', 'correctoptionindex', 'answerkey'].includes(normalizedKey),
      `Student quiz payload exposed ${path}.${key}`
    );
    assertNoAnswerKey(nested, `${path}.${key}`);
  }
}

async function studentTokenFromEnvironment() {
  if (process.env.LMS_STUDENT_TOKEN) return process.env.LMS_STUDENT_TOKEN;

  const email = process.env.LMS_STUDENT_EMAIL;
  const password = process.env.LMS_STUDENT_PASSWORD;
  if (!email && !password) return null;
  assert.ok(email && password, 'LMS_STUDENT_EMAIL and LMS_STUDENT_PASSWORD must be supplied together.');

  const { response, body } = await request('/auth/login', {
    method: 'POST',
    body: { email, password, role: 'student' }
  });
  expectStatus(response, 200, 'student login');
  assert.equal(typeof body?.accessToken, 'string', 'student login must return accessToken');
  return body.accessToken;
}

function answersFromEnvironment() {
  const raw = process.env.LMS_QUIZ_ANSWERS_JSON;
  if (!raw) return null;
  const answers = JSON.parse(raw);
  assert.ok(Array.isArray(answers), 'LMS_QUIZ_ANSWERS_JSON must be a JSON array.');
  assert.ok(answers.length > 0, 'LMS_QUIZ_ANSWERS_JSON must contain at least one answer.');
  for (const answer of answers) {
    assert.deepEqual(
      Object.keys(answer).sort(),
      ['questionId', 'selectedOptionIndex'],
      'Each answer may contain only questionId and selectedOptionIndex.'
    );
    assert.ok(Number.isSafeInteger(answer.questionId) && answer.questionId > 0, 'questionId must be a positive integer.');
    assert.ok(Number.isSafeInteger(answer.selectedOptionIndex) && answer.selectedOptionIndex >= 0, 'selectedOptionIndex must be a non-negative integer.');
  }
  return answers;
}

async function main() {
  console.log('Secure Exam public-route runtime harness');
  console.log(`API base: ${API_BASE_URL}`);
  console.log('Tokens, credentials, and fixture answers are read from environment and are never printed.\n');

  await test('missing token is rejected', async () => {
    const { response } = await request(`/exams/quizzes/${routeQuizId}`);
    expectStatus(response, 401, 'missing-token quiz load');
  });

  await test('invalid token is rejected', async () => {
    const { response } = await request(`/exams/quizzes/${routeQuizId}`, {
      headers: bearer('invalid-token-for-negative-test')
    });
    expectStatus(response, 401, 'invalid-token quiz load');
  });

  const hasStudentFixture = Boolean(
    process.env.LMS_STUDENT_TOKEN
      || process.env.LMS_STUDENT_EMAIL
      || process.env.LMS_STUDENT_PASSWORD
  );
  if (!hasStudentFixture || !/^[1-9]\d*$/.test(configuredQuizId)) {
    block(
      'quiz access and happy path',
      'set LMS_STUDENT_TOKEN (or LMS_STUDENT_EMAIL/LMS_STUDENT_PASSWORD) and LMS_ENROLLED_QUIZ_ID for an existing enrolled published quiz'
    );
    console.log(`\nSummary: ${passed} passed, ${failed} failed, ${blocked} blocked.`);
    if (failed > 0) process.exitCode = 1;
    return;
  }

  let studentToken;
  const tokenReady = await test('student fixture authentication', async () => {
    studentToken = await studentTokenFromEnvironment();
  });
  if (!tokenReady) {
    console.log(`\nSummary: ${passed} passed, ${failed} failed, ${blocked} blocked.`);
    process.exitCode = 1;
    return;
  }

  await test('invalid quiz ID is rejected before reaching Exam Service', async () => {
    const { response } = await request('/exams/quizzes/not-an-id', { headers: bearer(studentToken) });
    expectStatus(response, 400, 'invalid quiz ID');
  });

  const nonStudentToken = process.env.LMS_NON_STUDENT_TOKEN || process.env.LMS_INSTRUCTOR_TOKEN || process.env.LMS_ADMIN_TOKEN;
  if (nonStudentToken) {
    await test('non-student role cannot load a student quiz', async () => {
      const { response } = await request(`/exams/quizzes/${configuredQuizId}`, {
        headers: bearer(nonStudentToken)
      });
      expectStatus(response, 403, 'non-student quiz load');
    });
  } else {
    block('non-student role authorization', 'set LMS_NON_STUDENT_TOKEN, LMS_INSTRUCTOR_TOKEN, or LMS_ADMIN_TOKEN');
  }

  const unenrolledToken = process.env.LMS_UNENROLLED_STUDENT_TOKEN;
  if (unenrolledToken) {
    await test('unenrolled student cannot load the quiz', async () => {
      const { response, body } = await request(`/exams/quizzes/${configuredQuizId}`, {
        headers: bearer(unenrolledToken)
      });
      expectStatus(response, 403, 'unenrolled quiz load');
      assert.equal(body?.code, 'COURSE_ACCESS_REQUIRED');
    });
  } else {
    block('unenrolled-student access check', 'set LMS_UNENROLLED_STUDENT_TOKEN');
  }

  let loadedQuiz;
  const loaded = await test('enrolled student loads a published quiz without answer keys', async () => {
    const { response, body } = await request(`/exams/quizzes/${configuredQuizId}`, {
      headers: bearer(studentToken)
    });
    expectStatus(response, 200, 'enrolled quiz load');
    assert.ok(body?.quiz && typeof body.quiz === 'object', 'quiz response must contain quiz');
    assert.ok(Array.isArray(body.quiz.questions) && body.quiz.questions.length > 0, 'quiz must contain questions');
    assertNoAnswerKey(body);
    loadedQuiz = body.quiz;
  });

  if (loaded) {
    await test('invalid answer question ID is rejected without creating a result', async () => {
      const { response } = await request(`/exams/quizzes/${configuredQuizId}/submit`, {
        method: 'POST',
        headers: bearer(studentToken),
        body: { answers: [{ questionId: 2147483647, selectedOptionIndex: 0 }] }
      });
      expectStatus(response, 400, 'invalid quiz answer');
    });
  }

  let answers;
  try {
    answers = answersFromEnvironment();
  } catch (error) {
    failed += 1;
    console.error(`FAIL    quiz answer fixture: ${error.message}`);
  }

  if (!answers || !loadedQuiz) {
    block(
      'quiz submit/save/duplicate happy path',
      'set LMS_QUIZ_ANSWERS_JSON for a dedicated quiz that this student has not previously submitted'
    );
  } else {
    let result;
    const submitted = await test('Exam Service grades and saves the submission', async () => {
      const { response, body } = await request(`/exams/quizzes/${configuredQuizId}/submit`, {
        method: 'POST',
        headers: bearer(studentToken),
        body: { answers }
      });
      if (response.status === 409 && body?.code === 'QUIZ_ALREADY_SUBMITTED') {
        throw new BlockedTest('the configured student already submitted this quiz; provide a fresh dedicated fixture');
      }
      expectStatus(response, 201, 'quiz submit');
      assert.ok(body?.result && typeof body.result === 'object', 'submit response must contain result');
      assert.ok(Number.isFinite(Number(body.result.score)), 'server result must contain a numeric score');
      assert.ok(Number.isFinite(Number(body.result.maximumScore)), 'server result must contain a numeric maximumScore');
      assert.ok(Number.isFinite(Number(body.result.percentage)), 'server result must contain a numeric percentage');
      assert.equal(body.result.quizId, Number(configuredQuizId), 'saved result must reference the submitted quiz');
      if (process.env.LMS_EXPECTED_QUIZ_SCORE !== undefined) {
        assert.equal(Number(body.result.score), Number(process.env.LMS_EXPECTED_QUIZ_SCORE), 'server-calculated score mismatch');
      }
      result = body.result;
    });

    if (submitted && result) {
      await test('student retrieves the saved result through the public route', async () => {
        const { response, body } = await request(`/exams/results/${result.id}`, {
          headers: bearer(studentToken)
        });
        expectStatus(response, 200, 'saved result retrieval');
        assert.equal(body?.result?.id, result.id, 'retrieved result ID must match');
        assert.equal(body?.result?.quizId, Number(configuredQuizId), 'retrieved result must match quiz');
      });

      await test('duplicate submission is rejected safely', async () => {
        const { response, body } = await request(`/exams/quizzes/${configuredQuizId}/submit`, {
          method: 'POST',
          headers: bearer(studentToken),
          body: { answers }
        });
        expectStatus(response, 409, 'duplicate quiz submission');
        assert.equal(body?.code, 'QUIZ_ALREADY_SUBMITTED');
      });
    }
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${blocked} blocked.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(`FATAL ${error.message}`);
  process.exitCode = 1;
});
