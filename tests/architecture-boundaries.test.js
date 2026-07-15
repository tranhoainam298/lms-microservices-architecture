const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function sourceFiles(relativeDirectory, extensions) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  const files = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'bin' || entry.name === 'obj') continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (extensions.includes(path.extname(entry.name).toLowerCase())) {
        files.push(path.relative(root, absolute).replaceAll('\\', '/'));
      }
    }
  };
  visit(absoluteDirectory);
  return files;
}

const serviceSources = {
  'user-service': sourceFiles('user-service/src', ['.js']),
  'course-service': sourceFiles('course-service/src', ['.js']),
  'exam-service': sourceFiles('exam-service', ['.cs', '.json']),
  'payment-service': sourceFiles('payment-service', ['.js'])
};

const databaseMarkers = {
  user: [/user-db-mysql/i, /lms_user_db/i, /USER_DB_(HOST|NAME|PORT|USER|PASSWORD)/],
  course: [/course-db-mysql/i, /lms_course_db/i, /COURSE_DB_(HOST|NAME|PORT|USER|PASSWORD)/],
  exam: [/exam-db-mysql/i, /lms_exam_db/i, /EXAM_DB_(HOST|NAME|PORT|USER|PASSWORD)/],
  payment: [/payment-db-mysql/i, /lms_payment_db/i, /PAYMENT_DB_(HOST|NAME|PORT|USER|PASSWORD)/]
};

const ownership = {
  'user-service': 'user',
  'course-service': 'course',
  'exam-service': 'exam',
  'payment-service': 'payment'
};

for (const [service, files] of Object.entries(serviceSources)) {
  const source = files.map(read).join('\n');
  for (const [database, markers] of Object.entries(databaseMarkers)) {
    if (database === ownership[service]) continue;
    for (const marker of markers) {
      assert.doesNotMatch(source, marker, `${service} contains a direct ${database} database marker: ${marker}`);
    }
  }
  assert.doesNotMatch(source, /\.\.\/\.\.\/(user-service|course-service|exam-service|payment-service)/i,
    `${service} imports source from another service`);
}

const gatewaySource = [
  'api-gateway/src/server.js',
  'api-gateway/src/proxy/userServiceProxy.js',
  'api-gateway/src/proxy/courseServiceProxy.js',
  'api-gateway/src/proxy/examServiceProxy.js',
  'api-gateway/src/proxy/paymentServiceProxy.js'
].map(read).join('\n');
assert.doesNotMatch(gatewaySource, /mysql2|UseMySql|DbContext|DB_(HOST|NAME|USER|PASSWORD)|ConnectionStrings__/i,
  'API Gateway must not configure or access an application database');

const compose = read('docker-compose.yml');
function composeServiceBlock(serviceName) {
  const escaped = serviceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = compose.match(new RegExp(`^  ${escaped}:\\r?\\n([\\s\\S]*?)(?=^  [a-z0-9][a-z0-9-]*:\\r?$|^networks:)`, 'm'));
  assert.ok(match, `Compose service ${serviceName} must exist`);
  return match[0];
}

const composeRules = {
  'user-service': { ownNetwork: 'user-data-network', ownEnv: 'USER_DB_', bannedNetworks: ['course-data-network', 'exam-data-network', 'payment-data-network'] },
  'course-service': { ownNetwork: 'course-data-network', ownEnv: 'COURSE_DB_', bannedNetworks: ['user-data-network', 'exam-data-network', 'payment-data-network'] },
  'exam-service': { ownNetwork: 'exam-data-network', ownEnv: 'EXAM_DB_', bannedNetworks: ['user-data-network', 'course-data-network', 'payment-data-network'] },
  'payment-service': { ownNetwork: 'payment-data-network', ownEnv: 'PAYMENT_DB_', bannedNetworks: ['user-data-network', 'course-data-network', 'exam-data-network'] }
};

for (const [service, rule] of Object.entries(composeRules)) {
  const block = composeServiceBlock(service);
  assert.match(block, new RegExp(rule.ownNetwork), `${service} must join its own data network`);
  assert.match(block, new RegExp(rule.ownEnv), `${service} must receive its own database configuration`);
  for (const network of rule.bannedNetworks) {
    assert.doesNotMatch(block, new RegExp(`^\\s+- ${network}\\s*$`, 'm'), `${service} must not join ${network}`);
  }
  for (const [database, markers] of Object.entries(databaseMarkers)) {
    if (database === ownership[service]) continue;
    for (const marker of markers) {
      assert.doesNotMatch(block, marker, `${service} Compose block contains a ${database} database marker`);
    }
  }
}

for (const database of ['user', 'course', 'exam', 'payment']) {
  assert.match(compose, new RegExp(`^  ${database}-db-mysql:`, 'm'), `${database} database container must exist`);
}

console.log('ARCHITECTURE_BOUNDARIES_PASS');
