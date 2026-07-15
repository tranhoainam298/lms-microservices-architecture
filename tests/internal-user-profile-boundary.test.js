const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const userRoutes = read('user-service/src/routes/userRoutes.js');
const userService = read('user-service/src/services/userService.js');
const courseService = read('course-service/src/services/courseService.js');
const gatewayUserRoutes = read('api-gateway/src/routes/userRoutes.js');
const compose = read('docker-compose.yml');

assert.match(userRoutes, /router\.get\('\/internal\/profiles', internalServiceAuth, getInternalProfilesHandler\)/);
assert.match(userRoutes, /x-internal-service-secret/);
assert.match(userRoutes, /timingSafeEqual\(expected, provided\)/);
assert.match(userService, /SELECT id, full_name FROM users WHERE id IN/);
assert.doesNotMatch(userService, /password_hash[\s\S]*getInternalProfiles/,
  'Internal profile response must not select password hashes.');
assert.match(courseService, /USER_SERVICE_URL/);
assert.match(courseService, /\/users\/internal\/profiles/);
assert.match(courseService, /instructor: instructor \|\| \{ id: course\.instructor_id, fullName: null \}/);
assert.doesNotMatch(gatewayUserRoutes, /internal\/profiles/,
  'Internal profile endpoint must not be exposed by API Gateway.');
assert.match(compose, /user-service:[\s\S]*INTERNAL_SERVICE_SECRET:[\s\S]*course-service:/);
assert.match(compose, /course-service:[\s\S]*USER_SERVICE_URL:/);

console.log('INTERNAL_USER_PROFILE_BOUNDARY_PASS');
