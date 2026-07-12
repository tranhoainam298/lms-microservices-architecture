if (process.env.RUN_LEGACY_MOCK_PAYMENT_TEST !== 'true') {
  require('./test-zalopay-sandbox-flow.js');
} else {
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');

const apiBase = process.env.PAYMENT_E2E_API_BASE || 'http://localhost:8080/api';
const studentToken = process.env.PAYMENT_E2E_STUDENT_TOKEN;
const instructorToken = process.env.PAYMENT_E2E_INSTRUCTOR_TOKEN;
const adminToken = process.env.PAYMENT_E2E_ADMIN_TOKEN;
const otherStudentToken = process.env.PAYMENT_E2E_OTHER_STUDENT_TOKEN;
const otherStudentId = Number(process.env.PAYMENT_E2E_OTHER_STUDENT_ID || 6);
const courseId = Number(process.env.PAYMENT_E2E_COURSE_ID || 208);

if (!studentToken) throw new Error('PAYMENT_E2E_STUDENT_TOKEN is required.');

const tokenPayload = JSON.parse(Buffer.from(studentToken.split('.')[1], 'base64url').toString('utf8'));
const studentId = Number(tokenPayload.id || tokenPayload.sub);
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

async function runTest() {
  const paymentDb = await mysql.createConnection(paymentDbConfig);
  const courseDb = await mysql.createConnection(courseDbConfig);
  let paymentId;
  let foreignPaymentId;
  let initialEnrollmentIds = [];
  try {
    const [courseRows] = await courseDb.execute('SELECT price, status FROM courses WHERE id = ?', [courseId]);
    assert.equal(courseRows.length, 1, 'Test course must exist');
    assert.equal(courseRows[0].status, 'published', 'Test course must be published');
    const trustedAmount = Number(courseRows[0].price);
    const [initialEnrollments] = await courseDb.execute(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [studentId, courseId]
    );
    initialEnrollmentIds = initialEnrollments.map(row => row.id);

    let result = await request('/payments/checkout', { token: null, method: 'POST', body: { courseId } });
    assert.equal(result.status, 401, 'Missing token must be rejected');
    result = await request('/payments/checkout', { token: 'invalid.token.value', method: 'POST', body: { courseId } });
    assert.equal(result.status, 401, 'Invalid token must be rejected');
    for (const roleToken of [instructorToken, adminToken].filter(Boolean)) {
      result = await request('/payments/checkout', { token: roleToken, method: 'POST', body: { courseId } });
      assert.equal(result.status, 403, 'Non-student checkout must be rejected');
    }

    result = await request('/payments/checkout', {
      method: 'POST',
      body: { courseId, paymentMethod: 'zalopay', studentId: 999999, amount: 0.01, status: 'success' }
    });
    assert.equal(result.status, 201, 'Student checkout should be created');
    paymentId = result.body.payment.id;
    assert.equal(result.body.payment.status, 'pending');
    assert.equal(Number(result.body.payment.amount), trustedAmount, 'Amount must come from Course Service');

    const [pendingRows] = await paymentDb.execute('SELECT * FROM transactions WHERE id = ?', [paymentId]);
    assert.equal(pendingRows.length, 1);
    assert.equal(pendingRows[0].student_id, studentId, 'JWT student must own payment');
    assert.equal(Number(pendingRows[0].amount), trustedAmount, 'Forged amount must be ignored');
    assert.equal(pendingRows[0].status, 'pending', 'Forged status must be ignored');

    if (otherStudentToken) {
      result = await request('/payments/mock/complete', { token: otherStudentToken, method: 'POST', body: { paymentId } });
      assert.equal(result.status, 403, 'Another student must not complete this payment');
    }
    const [foreignInsert] = await paymentDb.execute(
      `INSERT INTO transactions
       (student_id, course_id, amount, status, gateway, gateway_transaction_id)
       VALUES (?, ?, ?, 'pending', 'zalopay', 'MOCK-ownership-test')`,
      [otherStudentId, courseId, trustedAmount]
    );
    foreignPaymentId = foreignInsert.insertId;
    result = await request('/payments/mock/complete', { method: 'POST', body: { paymentId: foreignPaymentId } });
    assert.equal(result.status, 403, 'Current student must not complete another existing student account payment');

    result = await request('/payments/mock/complete', { method: 'POST', body: { paymentId } });
    assert.equal(result.status, 200, 'Owner should complete mock payment');
    assert.equal(result.body.payment.status, 'success');
    assert.equal(result.body.enrollment.status, 'active');

    const [paidRows] = await paymentDb.execute('SELECT status FROM transactions WHERE id = ?', [paymentId]);
    assert.equal(paidRows[0].status, 'success');
    const [enrollments] = await courseDb.execute(
      'SELECT id, status FROM enrollments WHERE student_id = ? AND course_id = ?', [studentId, courseId]
    );
    assert.ok(enrollments.some(row => row.status === 'active'), 'Course DB enrollment must be active');

    result = await request('/courses/enrolled');
    assert.equal(result.status, 200);
    assert.ok(result.body.some(course => course.id === courseId), 'Purchased course must appear in enrolled courses');

    result = await request('/payments/mock/complete', { method: 'POST', body: { paymentId } });
    assert.equal(result.status, 200, 'Duplicate completion must be idempotent');
    const [afterDuplicate] = await courseDb.execute(
      'SELECT COUNT(*) AS count FROM enrollments WHERE student_id = ? AND course_id = ?', [studentId, courseId]
    );
    assert.equal(afterDuplicate[0].count, Math.max(1, initialEnrollmentIds.length));

    result = await request('/payments/mock/complete', { method: 'POST', body: { paymentId: 2147483647 } });
    assert.equal(result.status, 404, 'Nonexistent payment must return 404');
    console.log('PAYMENT_FLOW_E2E_PASS');
  } finally {
    if (paymentId) await paymentDb.execute('DELETE FROM transactions WHERE id = ?', [paymentId]);
    if (foreignPaymentId) await paymentDb.execute('DELETE FROM transactions WHERE id = ?', [foreignPaymentId]);
    if (initialEnrollmentIds.length === 0) {
      await courseDb.execute('DELETE FROM enrollments WHERE student_id = ? AND course_id = ?', [studentId, courseId]);
    }
    await paymentDb.end();
    await courseDb.end();
  }
}

runTest().catch(error => {
  console.error('PAYMENT_FLOW_E2E_FAIL:', error.message);
  process.exitCode = 1;
});
}
