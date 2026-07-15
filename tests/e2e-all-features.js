const assert = require('node:assert/strict');

const API_BASE_URL = String(process.env.LMS_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');
const HEALTH_URL = String(process.env.LMS_HEALTH_URL || 'http://localhost:8080/health');

const results = { passed: 0, failed: 0, skipped: 0 };

function authorization(token) {
  return { Authorization: `Bearer ${token}` };
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
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

function expectStatus(actual, expected, label) {
  assert.equal(actual, expected, `${label}: expected HTTP ${expected}, received ${actual}`);
}

async function test(name, callback) {
  try {
    await callback();
    results.passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    results.failed += 1;
    console.error(`FAIL  ${name}: ${error.message}`);
  }
}

function skip(name, reason) {
  results.skipped += 1;
  console.log(`SKIP  ${name}: ${reason}`);
}

function roleEnvironment(role) {
  const prefix = `LMS_${role.toUpperCase()}`;
  return {
    token: process.env[`${prefix}_TOKEN`],
    email: process.env[`${prefix}_EMAIL`],
    password: process.env[`${prefix}_PASSWORD`]
  };
}

async function loadRoleSession(role) {
  const environment = roleEnvironment(role);
  if (environment.token) return { token: environment.token };
  assert.ok(
    environment.email && environment.password,
    `Both LMS_${role.toUpperCase()}_EMAIL and LMS_${role.toUpperCase()}_PASSWORD are required.`
  );

  const { response, body } = await request('/auth/login', {
    method: 'POST',
    body: { email: environment.email, password: environment.password, role }
  });
  expectStatus(response.status, 200, `${role} login`);
  assert.equal(typeof body?.accessToken, 'string', `${role} login must return accessToken`);
  return { token: body.accessToken };
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

async function validateRole(role, session) {
  if (!session) {
    skip(
      `${role} authenticated checks`,
      `set LMS_${role.toUpperCase()}_TOKEN or LMS_${role.toUpperCase()}_EMAIL/LMS_${role.toUpperCase()}_PASSWORD`
    );
    return;
  }

  await test(`${role} identity is accepted through the public Gateway path`, async () => {
    const { response, body } = await request('/users/me', { headers: authorization(session.token) });
    expectStatus(response.status, 200, `${role} profile`);
    assert.equal(String(body?.user?.role).toLowerCase(), role, `token must belong to ${role}`);
  });

  if (role === 'student') {
    await test('student can list own enrollments without sending studentId', async () => {
      const { response, body } = await request('/courses/enrolled', { headers: authorization(session.token) });
      expectStatus(response.status, 200, 'student enrolled courses');
      assert.ok(Array.isArray(body), 'enrolled-course response must be an array');
    });

    await test('student can list own payments without sending studentId', async () => {
      const { response, body } = await request('/payments/mine', { headers: authorization(session.token) });
      expectStatus(response.status, 200, 'student payments');
      assert.ok(Array.isArray(body?.items), 'payment response must contain items array');
    });

    await test('student can list own quiz results without sending studentId', async () => {
      const { response, body } = await request('/exams/results/mine', { headers: authorization(session.token) });
      expectStatus(response.status, 200, 'student quiz results');
      assert.ok(Array.isArray(body?.items), 'quiz-result response must contain items array');
    });

    await test('student is forbidden from revenue reporting', async () => {
      const { response } = await request('/payments/reports/revenue', { headers: authorization(session.token) });
      expectStatus(response.status, 403, 'student revenue report');
    });

    const quizId = String(process.env.LMS_ENROLLED_QUIZ_ID || '').trim();
    if (/^[1-9]\d*$/.test(quizId)) {
      await test('enrolled student loads quiz without receiving answer keys', async () => {
        const { response, body } = await request(`/exams/quizzes/${quizId}`, {
          headers: authorization(session.token)
        });
        expectStatus(response.status, 200, 'student quiz load');
        assertNoAnswerKey(body);
      });
    } else {
      skip('enrolled student quiz load', 'set LMS_ENROLLED_QUIZ_ID to an existing accessible published quiz');
    }

    skip(
      'quiz submission happy path',
      'requires a dedicated enrolled quiz fixture and creates a persistent result; this harness does not fake enrollment or broadly clean data'
    );
  }

  if (role === 'instructor') {
    await test('instructor can list own drafts', async () => {
      const { response, body } = await request('/courses/drafts/mine', { headers: authorization(session.token) });
      expectStatus(response.status, 200, 'instructor drafts');
      assert.ok(Array.isArray(body?.items), 'draft response must contain items array');
    });

    await test('instructor is forbidden from revenue reporting', async () => {
      const { response } = await request('/payments/reports/revenue', { headers: authorization(session.token) });
      expectStatus(response.status, 403, 'instructor revenue report');
    });
  }

  if (role === 'admin') {
    await test('admin can list users', async () => {
      const { response, body } = await request('/users/admin/users', { headers: authorization(session.token) });
      expectStatus(response.status, 200, 'admin user list');
      assert.ok(Array.isArray(body?.items), 'admin user response must contain items array');
    });

    await test('admin revenue report returns current aggregate shape', async () => {
      const { response, body } = await request('/payments/reports/revenue', {
        headers: authorization(session.token)
      });
      expectStatus(response.status, 200, 'admin revenue report');
      assert.ok(body?.summary && typeof body.summary === 'object', 'revenue response must contain summary');
      assert.ok(Array.isArray(body?.courseBreakdown), 'revenue response must contain courseBreakdown array');
      assert.ok(Array.isArray(body?.transactions), 'revenue response must contain transactions array');
      assert.equal(body.summary.currency, 'VND', 'revenue currency must be VND');
    });

    await test('admin course report is reachable through current route', async () => {
      const { response, body } = await request('/courses/admin/reports/courses', {
        headers: authorization(session.token)
      });
      expectStatus(response.status, 200, 'admin course report');
      assert.ok(body && typeof body === 'object', 'course report must return an object');
    });
  }
}

async function main() {
  console.log('LMS current-route E2E smoke harness');
  console.log(`API base: ${API_BASE_URL}`);
  console.log('Credentials and tokens are read from environment and are never printed.\n');

  await test('public load-balancer health endpoint responds', async () => {
    const response = await fetch(HEALTH_URL);
    expectStatus(response.status, 200, 'public health');
  });

  await test('published course catalog uses the current public route', async () => {
    const { response, body } = await request('/courses');
    expectStatus(response.status, 200, 'course catalog');
    assert.ok(Array.isArray(body), 'course catalog must be an array');
    assert.ok(body.every(course => String(course.status).toLowerCase() === 'published'), 'catalog must contain only published courses');
  });

  await test('course search/filter query uses the current route', async () => {
    const { response, body } = await request('/courses?search=e2e&minPrice=0');
    expectStatus(response.status, 200, 'course search');
    assert.ok(Array.isArray(body), 'filtered course catalog must be an array');
  });

  await test('course categories use the current public route', async () => {
    const { response, body } = await request('/courses/categories');
    expectStatus(response.status, 200, 'course categories');
    assert.ok(Array.isArray(body?.items), 'category response must contain items array');
  });

  await test('registration route rejects an invalid payload without creating an account', async () => {
    const { response } = await request('/auth/register', { method: 'POST', body: {} });
    assert.ok(
      [400, 429].includes(response.status),
      `invalid registration: expected HTTP 400 or an active rate-limit 429, received ${response.status}`
    );
  });

  await test('revenue report rejects a missing token', async () => {
    const { response } = await request('/payments/reports/revenue');
    expectStatus(response.status, 401, 'missing-token revenue report');
  });

  await test('revenue report rejects an invalid token', async () => {
    const { response } = await request('/payments/reports/revenue', {
      headers: authorization('invalid-token-for-negative-test')
    });
    expectStatus(response.status, 401, 'invalid-token revenue report');
  });

  await test('checkout rejects a missing student token', async () => {
    const { response } = await request('/payments/checkout', {
      method: 'POST',
      body: { courseId: 1, paymentMethod: 'zalopay' }
    });
    expectStatus(response.status, 401, 'missing-token checkout');
  });

  await test('deprecated mock payment completion stays disabled', async () => {
    const { response, body } = await request('/payments/mock/complete', { method: 'POST', body: {} });
    expectStatus(response.status, 410, 'mock completion');
    assert.equal(body?.code, 'ENDPOINT_DEPRECATED');
  });

  for (const role of ['student', 'instructor', 'admin']) {
    const environment = roleEnvironment(role);
    if (!environment.token && !environment.email && !environment.password) {
      skip(`${role} role runtime suite`, `no ${role} token or credentials configured`);
      continue;
    }

    let session = null;
    await test(`${role} session configuration`, async () => {
      session = await loadRoleSession(role);
    });
    if (session) {
      await validateRole(role, session);
    }
  }

  console.log(`\nSummary: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped.`);
  if (results.failed > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(`FATAL ${error.message}`);
  process.exitCode = 1;
});
