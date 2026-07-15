const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

function validateEnvelope(event, expectedType, expectedSource, expectedDataKeys) {
  assert.deepEqual(Object.keys(event).sort(), [
    'data', 'eventId', 'eventType', 'eventVersion', 'occurredAt', 'source'
  ]);
  assert.match(event.eventId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(event.eventType, expectedType);
  assert.equal(event.eventVersion, 1);
  assert.equal(event.source, expectedSource);
  assert.equal(new Date(event.occurredAt).toISOString(), event.occurredAt);
  assert.deepEqual(Object.keys(event.data).sort(), [...expectedDataKeys].sort());

  const serialized = JSON.stringify(event).toLowerCase();
  for (const secretField of ['password', 'passwordhash', 'jwt', 'authorization', 'apikey', 'secret']) {
    assert.equal(serialized.includes(secretField), false, `${expectedType} contains forbidden sensitive field ${secretField}`);
  }
}

(async () => {
  const userPublisher = await import(pathToFileURL(path.join(root, 'user-service/src/events/publisher.js')));
  const paymentPublisher = await import(pathToFileURL(path.join(root, 'payment-service/src/events/publisher.js')));
  const coursePublisher = await import(pathToFileURL(path.join(root, 'course-service/src/data/courseEventPublisher.js')));
  const now = '2026-07-15T08:30:00.000Z';

  validateEnvelope(
    userPublisher.createUserLoggedInEvent({ userId: 101, role: 'student', loginTime: now }),
    'UserLoggedInEvent',
    'user-service',
    ['userId', 'role', 'loginTime']
  );
  validateEnvelope(
    paymentPublisher.createPaymentEventEnvelope('PaymentSucceededEvent', {
      paymentId: 501, studentId: 101, courseId: 208, amount: 249750,
      currency: 'VND', provider: 'zalopay', providerTransactionId: 'test-501'
    }, new Date(now)),
    'PaymentSucceededEvent',
    'payment-service',
    ['paymentId', 'studentId', 'courseId', 'amount', 'currency', 'provider', 'providerTransactionId']
  );
  validateEnvelope(
    paymentPublisher.createPaymentEventEnvelope('PaymentFailedEvent', {
      paymentId: 502, studentId: 101, courseId: 208, amount: 249750,
      currency: 'VND', provider: 'zalopay', providerTransactionId: 'test-502', failureCode: 'TEST_FAILURE'
    }, new Date(now)),
    'PaymentFailedEvent',
    'payment-service',
    ['paymentId', 'studentId', 'courseId', 'amount', 'currency', 'provider', 'providerTransactionId', 'failureCode']
  );
  validateEnvelope(
    coursePublisher.createCourseAccessActivatedEvent({
      studentId: 101, courseId: 208, enrollmentId: 701, activatedAt: now
    }),
    'CourseAccessActivatedEvent',
    'course-service',
    ['studentId', 'courseId', 'enrollmentId', 'activatedAt']
  );

  assert.equal(userPublisher.LMS_EVENT_EXCHANGE, 'lms_events');
  assert.equal(userPublisher.USER_LOGGED_IN_ROUTING_KEY, 'user.loggedin');
  assert.equal(paymentPublisher.LMS_EVENT_EXCHANGE, 'lms_events');
  assert.equal(paymentPublisher.PAYMENT_EVENT_DEFINITIONS.succeeded.routingKey, 'payment.succeeded');
  assert.equal(paymentPublisher.PAYMENT_EVENT_DEFINITIONS.failed.routingKey, 'payment.failed');
  assert.equal(coursePublisher.LMS_EVENT_EXCHANGE, 'lms_events');
  assert.equal(coursePublisher.COURSE_ACCESS_ACTIVATED_ROUTING_KEY, 'course.access.activated');

  const authService = read('user-service/src/services/authService.js');
  const userPublisherSource = read('user-service/src/events/publisher.js');
  const paymentService = read('payment-service/index.js');
  const paymentPublisherSource = read('payment-service/src/events/publisher.js');
  const paymentTransitions = read('payment-service/src/paymentTransitions.js');
  const courseService = read('course-service/src/services/courseService.js');
  const coursePublisherSource = read('course-service/src/data/courseEventPublisher.js');
  const retiredConsumer = read('course-service/src/rabbitmq-listener.js');
  assert.match(authService, /createUserLoggedInEvent/);
  assert.match(authService, /publishEvent/);
  for (const publisherSource of [userPublisherSource, paymentPublisherSource, coursePublisherSource]) {
    assert.match(publisherSource, /RABBITMQ_CONFIRM_TIMEOUT/);
    assert.match(publisherSource, /confirmTimeoutMs/);
    assert.match(publisherSource, /attempt\s*=\s*1[\s\S]*attempt\s*<=\s*2/);
  }
  assert.match(paymentService, /createPaymentTransitionManager/);
  assert.match(paymentTransitions, /status = 'success'.*status = 'pending'/s);
  assert.match(paymentTransitions, /status = 'failed'.*status = 'pending'/s);
  assert.match(paymentTransitions, /affectedRows === 1/);
  assert.match(paymentTransitions, /publishPaymentSucceeded/);
  assert.match(paymentTransitions, /publishPaymentFailed/);
  assert.match(paymentService, /SELECT GET_LOCK\(\?, 5\) AS acquired/);
  assert.match(paymentService, /SELECT RELEASE_LOCK\(\?\)/);
  assert.doesNotMatch(paymentService, /transitionPaymentToFailed\([^\n]*PROVIDER_REQUEST_FAILED/);
  const checkoutSource = paymentService.slice(
    paymentService.indexOf("app.post('/payments/checkout'"),
    paymentService.indexOf("app.get('/payments/mine'")
  );
  assert.match(checkoutSource, /A timeout or transport failure is ambiguous/);
  assert.doesNotMatch(checkoutSource, /PROVIDER_REQUEST_FAILED/);
  assert.match(checkoutSource, /paymentId:\s*String\(paymentId\)/);
  assert.doesNotMatch(checkoutSource, /paymentId:\s*String\(insertResult\.insertId\)/);
  assert.match(courseService, /await connection\.commit\(\)[\s\S]*publishCourseAccessActivated/);
  assert.match(courseService, /existing\[0\]\.status !== 'active'/);
  assert.doesNotMatch(retiredConsumer, /channel\.consume|bindQueue|enrollStudent/);
  assert.doesNotMatch(paymentService, /course-db-mysql|lms_course_db|FROM\s+enrollments/i);
  assert.doesNotMatch(courseService, /payment-db-mysql|lms_payment_db|FROM\s+transactions/i);

  console.log('EVENT_CONTRACTS_AND_TRANSITIONS_PASS');
})().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
