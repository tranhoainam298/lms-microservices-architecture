const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');

const apiBase = process.env.PAYMENT_E2E_API_BASE || 'http://localhost:8080/api';
const studentToken = process.env.PAYMENT_E2E_STUDENT_TOKEN;
const instructorToken = process.env.PAYMENT_E2E_INSTRUCTOR_TOKEN;
const adminToken = process.env.PAYMENT_E2E_ADMIN_TOKEN;
const courseId = Number(process.env.PAYMENT_E2E_COURSE_ID || 208);
const otherStudentId = Number(process.env.PAYMENT_E2E_OTHER_STUDENT_ID || 6);
const liveSandbox = process.env.PAYMENT_E2E_LIVE_ZALOPAY === 'true';
const expectUnconfiguredProvider = process.env.PAYMENT_E2E_EXPECT_UNCONFIGURED === 'true';

if (!studentToken) throw new Error('PAYMENT_E2E_STUDENT_TOKEN is required.');

const paymentDbConfig = {
  host: process.env.PAYMENT_DB_TEST_HOST || 'localhost',
  port: Number(process.env.PAYMENT_DB_TEST_PORT || 3309),
  user: process.env.PAYMENT_DB_TEST_USER,
  password: process.env.PAYMENT_DB_TEST_PASSWORD,
  database: process.env.PAYMENT_DB_TEST_NAME || 'lms_payment_db'
};
const courseDbConfig = {
  host: process.env.COURSE_DB_TEST_HOST || 'localhost',
  port: Number(process.env.COURSE_DB_TEST_PORT || 3317),
  user: process.env.COURSE_DB_TEST_USER,
  password: process.env.COURSE_DB_TEST_PASSWORD,
  database: process.env.COURSE_DB_TEST_NAME || 'lms_course_db'
};

async function request(path, { token = studentToken, method = 'GET', body } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const text = await response.text();
  let responseBody;
  try { responseBody = JSON.parse(text); } catch { responseBody = text; }
  return { status: response.status, body: responseBody };
}

async function run() {
  const paymentDb = await mysql.createConnection(paymentDbConfig);
  const courseDb = await mysql.createConnection(courseDbConfig);
  let ownershipFixtureId;
  let livePaymentId;
  try {
    let result = await request('/payments/checkout', { token: null, method: 'POST', body: { courseId } });
    assert.equal(result.status, 401);
    result = await request('/payments/checkout', { token: 'invalid.token.value', method: 'POST', body: { courseId } });
    assert.equal(result.status, 401);
    for (const roleToken of [instructorToken, adminToken].filter(Boolean)) {
      result = await request('/payments/checkout', { token: roleToken, method: 'POST', body: { courseId } });
      assert.equal(result.status, 403);
    }

    result = await request('/payments/callback/zalopay', {
      token: null,
      method: 'POST',
      body: { data: '{}', mac: 'invalid' }
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.return_code, -1);

    result = await request('/payments/mock/complete', { token: null, method: 'POST', body: { paymentId: 1 } });
    assert.equal(result.status, 410);

    const ownershipAppTransId = `260711_ownership_${Date.now().toString(36)}`;
    const [ownershipInsert] = await paymentDb.execute(
      `INSERT INTO transactions
       (student_id, course_id, amount, status, gateway, gateway_transaction_id)
       VALUES (?, ?, ?, 'pending', 'zalopay', ?)`,
      [otherStudentId, courseId, 1000, ownershipAppTransId]
    );
    ownershipFixtureId = ownershipInsert.insertId;
    result = await request(`/payments/check-status/${ownershipAppTransId}`);
    assert.equal(result.status, 403);

    if (liveSandbox) {
      const [courses] = await courseDb.execute('SELECT price, status FROM courses WHERE id = ?', [courseId]);
      assert.equal(courses.length, 1);
      assert.equal(courses[0].status, 'published');
      const expectedVnd = Math.round(Number(courses[0].price) * Number(process.env.COURSE_PRICE_TO_VND_RATE || 25000));
      result = await request('/payments/checkout', {
        method: 'POST',
        body: { courseId, paymentMethod: 'zalopay', studentId: 999999, amount: 1, status: 'success' }
      });
      assert.equal(result.status, 201);
      assert.equal(result.body.payment.status, 'pending');
      assert.equal(result.body.payment.amount, expectedVnd);
      assert.equal(result.body.payment.currency, 'VND');
      assert.match(result.body.payment.appTransId, /^\d{6}_[A-Za-z0-9_]+$/);
      assert.ok(result.body.payment.orderUrl);
      livePaymentId = result.body.payment.id;
      const [rows] = await paymentDb.execute('SELECT student_id, amount, status FROM transactions WHERE id = ?', [livePaymentId]);
      const tokenPayload = JSON.parse(Buffer.from(studentToken.split('.')[1], 'base64url').toString('utf8'));
      assert.equal(rows[0].student_id, Number(tokenPayload.id || tokenPayload.sub));
      assert.equal(Number(rows[0].amount), expectedVnd);
      assert.equal(rows[0].status, 'pending');
      console.log('LIVE_ZALOPAY_CREATE_PASS');
    } else if (expectUnconfiguredProvider) {
      result = await request('/payments/checkout', { method: 'POST', body: { courseId, studentId: 999999, amount: 1, status: 'success' } });
      assert.equal(result.status, 503);
      assert.equal(result.body.code, 'ZALOPAY_NOT_CONFIGURED');
      console.log('LIVE_ZALOPAY_SANDBOX_BLOCKED: missing ZALOPAY_APP_ID/ZALOPAY_KEY1/ZALOPAY_KEY2');
    } else {
      console.log('LIVE_ZALOPAY_SANDBOX_NOT_RUN: set PAYMENT_E2E_LIVE_ZALOPAY=true with sandbox credentials');
    }

    console.log('ZALOPAY_STATIC_SECURITY_TESTS_PASS');
  } finally {
    if (ownershipFixtureId) await paymentDb.execute('DELETE FROM transactions WHERE id = ?', [ownershipFixtureId]);
    if (livePaymentId) await paymentDb.execute('DELETE FROM transactions WHERE id = ?', [livePaymentId]);
    await paymentDb.end();
    await courseDb.end();
  }
}

run().catch(error => {
  console.error('ZALOPAY_PAYMENT_TEST_FAIL:', error.message);
  process.exitCode = 1;
});
