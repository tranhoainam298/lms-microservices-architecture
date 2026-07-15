const requiredSandboxCredentials = ['ZALOPAY_APP_ID', 'ZALOPAY_KEY1', 'ZALOPAY_KEY2'];
const requiredRuntimeFixture = [
  'PAYMENT_E2E_STUDENT_TOKEN',
  'PAYMENT_DB_TEST_USER',
  'PAYMENT_DB_TEST_PASSWORD',
  'COURSE_DB_TEST_USER',
  'COURSE_DB_TEST_PASSWORD'
];
const isPlaceholder = value => !value || /^your_/i.test(value);

const missingFixture = requiredRuntimeFixture.filter(name => !process.env[name]);
const missingCredentials = requiredSandboxCredentials.filter(name => isPlaceholder(process.env[name]));

if (missingFixture.length > 0) {
  console.log(`PAYMENT_RUNTIME_BLOCKED: missing ${missingFixture.join('/')}`);
  if (missingCredentials.length > 0) {
    console.log(`LIVE_ZALOPAY_SANDBOX_BLOCKED: missing ${missingCredentials.join('/')}`);
  }
} else if (
  process.env.PAYMENT_E2E_LIVE_ZALOPAY === 'true'
  && missingCredentials.length > 0
) {
  console.log(`LIVE_ZALOPAY_SANDBOX_BLOCKED: missing ${missingCredentials.join('/')}`);
} else {
  require('./test-zalopay-sandbox-flow.js');
}
