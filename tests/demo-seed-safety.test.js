const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const files = {
  user: read('infra/mysql-init/demo-seed-user.sql'),
  course: read('infra/mysql-init/demo-seed-course.sql'),
  exam: read('infra/mysql-init/demo-seed-exam.sql'),
  payment: read('infra/mysql-init/demo-seed-payment.sql'),
  powershell: read('scripts/seed-demo-data.ps1'),
  batch: read('seed-demo-data.bat'),
  compose: read('docker-compose.yml'),
  legacy: read('scripts/seed-mock-data.js')
};

const seedSource = Object.values(files).join('\n');
const forbidden = [
  /drop\s+(table|database)/i,
  /\btruncate\b/i,
  /delete\s+from/i,
  /docker\s+compose\s+down/i,
  /docker\s+volume\s+(rm|prune)/i,
  /docker\s+system\s+prune/i,
  /remove-item\s+-recurse/i,
  /rm\s+-rf/i
];
for (const pattern of forbidden) {
  assert.doesNotMatch(seedSource, pattern, `Demo seed flow contains forbidden operation ${pattern}`);
}

for (const sql of [files.user, files.course, files.exam, files.payment]) {
  assert.match(sql, /START TRANSACTION;/i);
  assert.match(sql, /COMMIT;/i);
  assert.match(sql, /ON DUPLICATE KEY UPDATE/i, 'Every seed file must use idempotent upserts.');
  assert.match(sql, /SET @demo_seed_anchor = TIMESTAMP\('2026-07-01 12:00:00'\);/i,
    'Every seed domain must use the same deterministic timestamp anchor.');
  assert.doesNotMatch(sql, /CURRENT_TIMESTAMP/i,
    'Seed timestamps must not drift between repeated runs.');
  assert.match(sql, /Existing volumes must be seeded through seed-demo-data\.bat/i);
}

assert.match(files.user, /IF\(users\.id = VALUES\(id\).*BINARY users\.email = BINARY VALUES\(email\)/i);
assert.match(files.course, /IF\(courses\.id = VALUES\(id\).*BINARY courses\.title = BINARY VALUES\(title\)/i);
assert.match(files.exam, /IF\(quizzes\.Id = VALUES\(Id\).*quizzes\.CourseId = VALUES\(CourseId\)/i);
assert.match(files.payment, /IF\(transactions\.id = VALUES\(id\).*transactions\.gateway_transaction_id/i);

const userRows = [...files.user.matchAll(/\((9\d{3}),\s*'([^']+@lms\.demo)',[\s\S]*?'(admin|instructor|student)',\s*'(active|inactive)'\)/g)]
  .map(match => ({ id: Number(match[1]), email: match[2], role: match[3], status: match[4] }));
assert.equal(userRows.length, 27, 'Expected 27 deterministic demo users.');
assert.equal(new Set(userRows.map(row => row.id)).size, 27);
assert.equal(new Set(userRows.map(row => row.email)).size, 27);
assert.equal(userRows.filter(row => row.role === 'admin').length, 2);
assert.equal(userRows.filter(row => row.role === 'instructor').length, 5);
assert.equal(userRows.filter(row => row.role === 'student').length, 20);
assert.ok(userRows.filter(row => row.status === 'inactive').length >= 3);

const auditUsersBlock = files.user.match(/FROM \([\s\S]*?\) u\s*CROSS JOIN/)[0];
const auditUserIds = new Set([...auditUsersBlock.matchAll(/\b(900[12]|910[1-5]|92(?:0[1-9]|1\d|20))\b/g)].map(match => Number(match[1])));
assert.equal(auditUserIds.size, 27);
const auditAttemptBlock = files.user.match(/CROSS JOIN \(([\s\S]*?)\) a/)[1];
const auditAttempts = [...auditAttemptBlock.matchAll(/(?:SELECT|UNION ALL SELECT)\s+([123])/g)].map(match => Number(match[1]));
assert.deepEqual(auditAttempts, [1, 2, 3]);
assert.equal(auditUserIds.size * 3, 81, 'Expected 81 deterministic login audit rows.');

const courseRows = [...files.course.matchAll(/\((200\d{2}),\s*'([^']+)',\s*'[^']+',\s*'([^']+)',\s*([\d.]+),[\s\S]*?,\s*(910[1-5]),\s*'(published|draft)'/g)]
  .map(match => ({ id: Number(match[1]), title: match[2], category: match[3], price: Number(match[4]), instructorId: Number(match[5]), status: match[6] }));
assert.equal(courseRows.length, 12, 'Expected 12 deterministic demo courses.');
assert.equal(courseRows.filter(row => row.status === 'published').length, 9);
assert.equal(courseRows.filter(row => row.status === 'draft').length, 3);
assert.ok(courseRows.some(row => row.price === 0));
assert.ok(courseRows.some(row => row.price > 0));

const lessonCourseBlock = files.course.match(/FROM \(([\s\S]*?)\) c\s*CROSS JOIN/)[1];
const lessonCourseDefinitions = new Set([...lessonCourseBlock.matchAll(/\b(200(?:0[1-9]|1[0-2]))\b/g)].map(match => Number(match[1]))).size;
const lessonTemplateBlock = files.course.match(/CROSS JOIN \(([\s\S]*?)\) t\s*WHERE/)[1];
const lessonTemplates = [...lessonTemplateBlock.matchAll(/(?:SELECT|UNION ALL SELECT)\s+([1-5])/g)].length;
assert.equal(lessonCourseDefinitions, 12, 'Expected 12 course definitions for generated lessons.');
assert.equal(lessonTemplates, 5, 'Expected five lessons per course.');
assert.equal(lessonCourseDefinitions * lessonTemplates, 60, 'Expected 60 deterministic lessons.');

const enrollmentRows = [...files.course.matchAll(/\((220\d{2}),\s*(92\d{2}),\s*(200\d{2}),\s*(0|20|40|60|80|100),\s*'active'/g)]
  .map(match => ({ id: Number(match[1]), studentId: Number(match[2]), courseId: Number(match[3]), progress: Number(match[4]) }));
assert.equal(enrollmentRows.length, 40, 'Expected 40 deterministic enrollments.');
assert.equal(new Set(enrollmentRows.map(row => row.id)).size, 40);
const enrollmentKeys = new Set(enrollmentRows.map(row => `${row.studentId}:${row.courseId}`));
assert.equal(enrollmentKeys.size, 40, 'Seeded enrollment student/course pairs must be unique.');
assert.deepEqual([...new Set(enrollmentRows.map(row => row.progress))].sort((a, b) => a - b), [0, 20, 40, 60, 80, 100]);
assert.equal(enrollmentRows.reduce((sum, row) => sum + row.progress / 20, 0), 96, 'Expected 96 seeded lesson-progress rows.');

const quizRows = [...files.exam.matchAll(/\((3000[1-8]),\s*(2000[1-8]),\s*(910[1-4]),/g)]
  .map(match => ({ id: Number(match[1]), courseId: Number(match[2]), instructorId: Number(match[3]) }));
assert.equal(quizRows.length, 8, 'Expected eight deterministic quizzes.');
const quizCourses = new Map(quizRows.map(row => [row.id, row.courseId]));

const questionRows = [...files.exam.matchAll(/\((310\d{2}),\s*(2000[1-8]),\s*(3000[1-8]),/g)]
  .map(match => ({ id: Number(match[1]), courseId: Number(match[2]), quizId: Number(match[3]) }));
assert.equal(questionRows.length, 40, 'Expected 40 deterministic questions.');
assert.equal(new Set(questionRows.map(row => row.id)).size, 40);
for (const question of questionRows) {
  assert.equal(question.courseId, quizCourses.get(question.quizId), `Question ${question.id} has an invalid course/quiz relationship.`);
}

const resultRows = [...files.exam.matchAll(/\((320\d{2}),\s*(92\d{2}),\s*(3000[1-8]),/g)]
  .map(match => ({ id: Number(match[1]), studentId: Number(match[2]), quizId: Number(match[3]) }));
assert.equal(resultRows.length, 24, 'Expected 24 deterministic quiz results.');
assert.equal(new Set(resultRows.map(row => `${row.studentId}:${row.quizId}`)).size, 24);
for (const result of resultRows) {
  assert.ok(enrollmentKeys.has(`${result.studentId}:${quizCourses.get(result.quizId)}`), `Result ${result.id} must belong to an enrolled student.`);
}

const paymentRows = [...files.payment.matchAll(/\((400\d{2}),\s*(92\d{2}),\s*(2000[2-8]),\s*(\d+),\s*'(success|pending|failed)',\s*'demo_seed',\s*'(DEMO-SEED-\d{4})'/g)]
  .map(match => ({ id: Number(match[1]), studentId: Number(match[2]), courseId: Number(match[3]), amount: Number(match[4]), status: match[5], providerId: match[6] }));
assert.equal(paymentRows.length, 36, 'Expected 36 deterministic payment transactions.');
assert.equal(new Set(paymentRows.map(row => row.id)).size, 36);
assert.equal(new Set(paymentRows.map(row => row.providerId)).size, 36, 'Provider transaction IDs must be unique.');
assert.equal(paymentRows.filter(row => row.status === 'success').length, 24);
assert.equal(paymentRows.filter(row => row.status === 'pending').length, 6);
assert.equal(paymentRows.filter(row => row.status === 'failed').length, 6);

const coursePrices = new Map(courseRows.map(row => [row.id, row.price]));
for (const payment of paymentRows) {
  assert.equal(payment.amount, Math.round(coursePrices.get(payment.courseId) * 25000), `Payment ${payment.id} must match the trusted seeded course price.`);
  if (payment.status === 'success') {
    assert.ok(enrollmentKeys.has(`${payment.studentId}:${payment.courseId}`), `Successful payment ${payment.id} must have an active enrollment.`);
  }
}

for (const [container, file] of [
  ['user-db-mysql', 'demo-seed-user.sql'],
  ['course-db-mysql', 'demo-seed-course.sql'],
  ['exam-db-mysql', 'demo-seed-exam.sql'],
  ['payment-db-mysql', 'demo-seed-payment.sql']
]) {
  assert.match(files.powershell, new RegExp(container));
  assert.match(files.powershell, new RegExp(file.replace('.', '\\.')));
  assert.match(files.compose, new RegExp(`${file.replace('.', '\\.')}:/docker-entrypoint-initdb\\.d/zz-demo-seed\\.sql:ro`));
}
assert.match(files.batch, /scripts\\seed-demo-data\.ps1/i);
assert.match(files.batch, /http:\/\/localhost:8080/i);
assert.doesNotMatch(files.powershell, /Write-(Host|Output)[^\n]*(MYSQL_PASSWORD|password)/i);
assert.doesNotMatch(files.powershell, /init-(user|course|exam|payment)-db\.sql/i, 'Current-volume seeding must not replay schema initializers.');
assert.match(files.powershell, /function Get-DemoIdentityManifest/i);
assert.match(files.powershell, /function Assert-CrossDomainIdentityManifest/i);
assert.match(files.powershell, /function Get-DemoSeedCollisions/i);
assert.match(files.powershell, /function Assert-DemoSeedPreflight/i);
assert.match(files.powershell, /Demo seed identity collision detected before any write/i);
assert.match(files.powershell, /\[switch\]\$PreflightOnly/i);
assert.match(files.powershell, /Read-only demo seed preflight passed\. No seed SQL was applied/i);
for (const table of ['users', 'login_audit', 'courses', 'lessons', 'enrollments', 'quizzes', 'questions', 'quiz_results', 'transactions']) {
  assert.match(files.powershell, new RegExp(`JOIN ${table} actual`, 'i'), `Collision preflight must cover ${table}.`);
}
for (const naturalKey of ['actual.email = expected.Email', 'BINARY actual.title = BINARY expected.Title',
  'actual.student_id = expected.StudentId AND actual.course_id = expected.CourseId',
  'actual.QuizId = expected.QuizId AND actual.OrderIndex = expected.OrderIndex',
  'actual.gateway_transaction_id = BINARY expected.GatewayTransactionId']) {
  assert.ok(files.powershell.toLowerCase().includes(naturalKey.toLowerCase()),
    `Collision preflight must compare natural key: ${naturalKey}`);
}
const preflightCall = files.powershell.lastIndexOf('Assert-DemoSeedPreflight -Manifest $manifest');
const firstMutation = files.powershell.lastIndexOf('Apply-DemoSeed -Target $target');
assert.ok(preflightCall >= 0 && firstMutation > preflightCall,
  'All collision preflight checks must run before the first seed SQL is applied.');
const collisionFunction = files.powershell.slice(
  files.powershell.indexOf('function Get-DemoSeedCollisions'),
  files.powershell.indexOf('function Assert-DemoSeedPreflight')
);
assert.doesNotMatch(collisionFunction, /\b(INSERT|UPDATE|DELETE|REPLACE|ALTER|CREATE|DROP|TRUNCATE)\b/i,
  'Collision preflight SQL must remain read-only.');
assert.match(files.legacy, /seed-demo-data\.bat/i);
assert.doesNotMatch(files.legacy, /mysql2|bcrypt|localhost.*33\d{2}|password:\s*['"]/i);

console.log('DEMO_SEED_SAFETY_PASS users=27 audits=81 courses=12 lessons=60 enrollments=40 progress=96 quizzes=8 questions=40 results=24 payments=36');
