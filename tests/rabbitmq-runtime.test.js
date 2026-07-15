const assert = require('node:assert/strict');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const requireFromPayment = createRequire(path.join(root, 'payment-service/package.json'));
const amqp = requireFromPayment('amqplib');
const publicBase = process.env.LMS_PUBLIC_API || 'http://localhost:8080/api';

function containerEnv(container) {
  const output = execFileSync('docker', [
    'inspect', '--format', '{{range .Config.Env}}{{println .}}{{end}}', container
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return Object.fromEntries(output.split(/\r?\n/).filter(Boolean).map(line => {
    const separator = line.indexOf('=');
    return separator < 0 ? [line, ''] : [line.slice(0, separator), line.slice(separator + 1)];
  }));
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = {}; }
  return { response, body };
}

function waitForEvent(events, routingKey, timeoutMs = 10000) {
  const existing = events.find(event => event.routingKey === routingKey);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const match = events.find(event => event.routingKey === routingKey);
      if (match) {
        clearInterval(timer);
        resolve(match);
      } else if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(timer);
        reject(new Error(`Timed out waiting for ${routingKey}`));
      }
    }, 50);
  });
}

function assertRuntimeEnvelope(message, expectedType, expectedSource) {
  assert.equal(message.eventType, expectedType);
  assert.equal(message.eventVersion, 1);
  assert.equal(message.source, expectedSource);
  assert.match(message.eventId, /^[0-9a-f-]{36}$/i);
  assert.equal(new Date(message.occurredAt).toISOString(), message.occurredAt);
  const serialized = JSON.stringify(message).toLowerCase();
  for (const forbidden of ['password', 'password_hash', 'jwt', 'authorization', 'api_key', 'secret']) {
    assert.equal(serialized.includes(forbidden), false, `${expectedType} contains ${forbidden}`);
  }
}

function activateCourseAccess({ studentId, courseId, internalSecret }) {
  const script = [
    "const response=await fetch('http://127.0.0.1:5002/courses/internal/enrollments/activate',{",
    "method:'POST',headers:{'content-type':'application/json','x-internal-service-secret':process.env.LMS_TEST_INTERNAL_SECRET},",
    "body:JSON.stringify({studentId:Number(process.env.LMS_TEST_STUDENT_ID),courseId:Number(process.env.LMS_TEST_COURSE_ID)})});",
    "const body=await response.text(); console.log(JSON.stringify({status:response.status,body:JSON.parse(body)}));"
  ].join('');
  const output = execFileSync('docker', [
    'exec',
    '-e', `LMS_TEST_INTERNAL_SECRET=${internalSecret}`,
    '-e', `LMS_TEST_STUDENT_ID=${studentId}`,
    '-e', `LMS_TEST_COURSE_ID=${courseId}`,
    'course-service', 'node', '--input-type=module', '-e', script
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(output.trim());
}

function enrollmentCount(studentId, courseId) {
  const env = containerEnv('course-db-mysql');
  const output = execFileSync('docker', [
    'exec', '-e', `MYSQL_PWD=${env.MYSQL_PASSWORD}`, 'course-db-mysql',
    'mysql', '-N', '-u', env.MYSQL_USER, '-D', env.MYSQL_DATABASE,
    '-e', `SELECT COUNT(*) FROM enrollments WHERE student_id=${Number(studentId)} AND course_id=${Number(courseId)};`
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return Number(output.trim());
}

(async () => {
  let connection;
  let channel;
  let queueName;
  let paymentPublisher;
  try {
  const rabbitEnv = containerEnv('lms-rabbitmq');
  const rabbitUrl = `amqp://${encodeURIComponent(rabbitEnv.RABBITMQ_DEFAULT_USER)}:${encodeURIComponent(rabbitEnv.RABBITMQ_DEFAULT_PASS)}@127.0.0.1:5672`;
  connection = await amqp.connect(rabbitUrl);
  channel = await connection.createChannel();
  await channel.assertExchange('lms_events', 'topic', { durable: true });
  const queue = await channel.assertQueue('', { exclusive: true, autoDelete: true });
  queueName = queue.queue;
  const routingKeys = ['user.loggedin', 'payment.succeeded', 'payment.failed', 'course.access.activated'];
  for (const routingKey of routingKeys) await channel.bindQueue(queue.queue, 'lms_events', routingKey);

  const events = [];
  await channel.consume(queue.queue, message => {
    if (!message) return;
    events.push({ routingKey: message.fields.routingKey, body: JSON.parse(message.content.toString('utf8')) });
    channel.ack(message);
  });

  const unique = `${Date.now()}-${randomBytes(3).toString('hex')}`;
  const email = `rabbit-runtime-${unique}@example.test`;
  const password = `Aa7!${randomBytes(12).toString('hex')}`;
  const registration = await requestJson(`${publicBase}/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, fullName: 'Runtime Event Student', role: 'student' })
  });
  assert.equal(registration.response.status, 201, registration.body.message || 'registration failed');
  const studentId = registration.body.user.id;

  const login = await requestJson(`${publicBase}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, role: 'student' })
  });
  assert.equal(login.response.status, 200, login.body.message || 'login failed');
  const loginEvent = await waitForEvent(events, 'user.loggedin');
  assertRuntimeEnvelope(loginEvent.body, 'UserLoggedInEvent', 'user-service');
  assert.deepEqual(loginEvent.body.data, {
    userId: studentId, role: 'student', loginTime: loginEvent.body.data.loginTime
  });

  const catalog = await requestJson(`${publicBase}/courses`);
  assert.equal(catalog.response.status, 200);
  assert.ok(Array.isArray(catalog.body) && catalog.body.length >= 2, 'At least two published courses are required for the safe runtime event test.');
  const activationCourseId = catalog.body[0].id;
  const failedCourseId = catalog.body.find(course => course.id !== activationCourseId).id;

  const paymentModule = await import(pathToFileURL(path.join(root, 'payment-service/src/events/publisher.js')));
  const transitionsModule = await import(pathToFileURL(path.join(root, 'payment-service/src/paymentTransitions.js')));
  paymentPublisher = paymentModule.createPaymentEventPublisher({ amqpUrl: rabbitUrl });
  assert.equal(await paymentPublisher.start(), true);
  const successPaymentId = Date.now();
  const failedPaymentId = successPaymentId + 1;
  const fakeTransactions = new Map([
    [successPaymentId, { id: successPaymentId, student_id: studentId, course_id: activationCourseId, amount: 10000, status: 'pending', gateway: 'runtime-test', gateway_transaction_id: `success-${unique}`, created_at: new Date().toISOString() }],
    [failedPaymentId, { id: failedPaymentId, student_id: studentId, course_id: failedCourseId, amount: 10000, status: 'pending', gateway: 'runtime-test', gateway_transaction_id: `failed-${unique}`, created_at: new Date().toISOString() }]
  ]);
  const fakePool = {
    async execute(statement, parameters) {
      const paymentId = Number(parameters[0]);
      const transaction = fakeTransactions.get(paymentId);
      if (/UPDATE transactions SET status = 'success'/.test(statement)) {
        const affectedRows = transaction?.status === 'pending' ? 1 : 0;
        if (affectedRows) transaction.status = 'success';
        return [{ affectedRows }];
      }
      if (/UPDATE transactions SET status = 'failed'/.test(statement)) {
        const affectedRows = transaction?.status === 'pending' ? 1 : 0;
        if (affectedRows) transaction.status = 'failed';
        return [{ affectedRows }];
      }
      if (/SELECT \* FROM transactions/.test(statement)) {
        return [transaction ? [{ ...transaction }] : []];
      }
      throw new Error('Unexpected transition test SQL.');
    }
  };
  const courseEnv = containerEnv('course-service');
  const transitionManager = transitionsModule.createPaymentTransitionManager({
    pool: fakePool,
    paymentEvents: paymentPublisher,
    normalizePayment: row => ({ id: row.id, courseId: row.course_id, studentId: row.student_id, status: row.status }),
    paymentEventData: row => ({
      paymentId: row.id, studentId: row.student_id, courseId: row.course_id,
      amount: Number(row.amount), currency: 'VND', provider: row.gateway,
      providerTransactionId: row.gateway_transaction_id
    }),
    activateCourseAccess: async (activeStudentId, activeCourseId) => {
      const result = activateCourseAccess({
        studentId: activeStudentId, courseId: activeCourseId,
        internalSecret: courseEnv.INTERNAL_SERVICE_SECRET
      });
      if (result.status !== 200) throw new Error(result.body?.message || 'Course activation failed.');
      return result.body.enrollment;
    }
  });
  const completedPayment = await transitionManager.finalizePaidPayment(fakeTransactions.get(successPaymentId));
  assert.equal(completedPayment.payment.status, 'success');
  const succeededEvent = await waitForEvent(events, 'payment.succeeded');
  assertRuntimeEnvelope(succeededEvent.body, 'PaymentSucceededEvent', 'payment-service');

  const accessEvent = await waitForEvent(events, 'course.access.activated');
  assertRuntimeEnvelope(accessEvent.body, 'CourseAccessActivatedEvent', 'course-service');
  assert.equal(enrollmentCount(studentId, activationCourseId), 1);

  const activatedEventCount = events.filter(event => event.routingKey === 'course.access.activated').length;
  const succeededEventCount = events.filter(event => event.routingKey === 'payment.succeeded').length;
  const repeatedCompletion = await transitionManager.finalizePaidPayment(fakeTransactions.get(successPaymentId));
  assert.equal(repeatedCompletion.payment.status, 'success');
  await new Promise(resolve => setTimeout(resolve, 1200));
  assert.equal(events.filter(event => event.routingKey === 'course.access.activated').length, activatedEventCount);
  assert.equal(events.filter(event => event.routingKey === 'payment.succeeded').length, succeededEventCount);
  assert.equal(enrollmentCount(studentId, activationCourseId), 1);

  assert.equal(enrollmentCount(studentId, failedCourseId), 0);
  const failedPayment = await transitionManager.transitionPaymentToFailed(failedPaymentId, 'RUNTIME_TEST_FAILURE');
  assert.equal(failedPayment.status, 'failed');
  const failedEvent = await waitForEvent(events, 'payment.failed');
  assertRuntimeEnvelope(failedEvent.body, 'PaymentFailedEvent', 'payment-service');
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.equal(enrollmentCount(studentId, failedCourseId), 0, 'Failed payment event must not create enrollment.');

  console.log(`RABBITMQ_RUNTIME_PASS user.loggedin=1 payment.succeeded=1 payment.failed=1 course.access.activated=1 idempotentEnrollment=1 failedEnrollment=0 testUserId=${studentId}`);
  } finally {
    if (paymentPublisher?.close) await paymentPublisher.close().catch(() => {});
    if (channel) {
      if (queueName) await channel.deleteQueue(queueName).catch(() => {});
      await channel.close().catch(() => {});
    }
    if (connection) await connection.close().catch(() => {});
  }
})().catch(error => {
  console.error(`RABBITMQ_RUNTIME_FAIL ${error.message}`);
  process.exit(1);
});
