import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const service = readFileSync('course-service/src/services/courseService.js', 'utf8');
const controller = readFileSync('course-service/src/controllers/courseController.js', 'utf8');
const serviceRoutes = readFileSync('course-service/src/routes/courseRoutes.js', 'utf8');
const gatewayProxy = readFileSync('api-gateway/src/proxy/courseServiceProxy.js', 'utf8');
const gatewayRoutes = readFileSync('api-gateway/src/routes/courseRoutes.js', 'utf8');

assert.match(service, /const clauses = \["status = 'published'"\]/, 'Public catalog must be published-only.');
assert.match(service, /title LIKE \? OR description LIKE \?/, 'Catalog search must use SQL placeholders.');
assert.match(service, /clauses\.push\('category = \?'\)/, 'Category filter must use a SQL placeholder.');
assert.match(service, /clauses\.push\('price >= \?'\)/, 'Minimum price must use a SQL placeholder.');
assert.match(service, /clauses\.push\('price <= \?'\)/, 'Maximum price must use a SQL placeholder.');

const detailStart = service.indexOf('export async function getPublishedCourseDetail');
const detailEnd = service.indexOf('export async function getPublishedCourseCategories');
assert.ok(detailStart >= 0 && detailEnd > detailStart, 'Published course detail implementation must exist.');
const detailImplementation = service.slice(detailStart, detailEnd);
assert.match(detailImplementation, /WHERE id = \? AND status = 'published'/);
assert.doesNotMatch(detailImplementation, /videoUrl\s*:/, 'Public detail must not return video URLs.');
assert.doesNotMatch(detailImplementation, /documentUrl\s*:/, 'Public detail must not return document URLs.');
assert.doesNotMatch(detailImplementation, /content\s*:/, 'Public detail must not return protected lesson content.');

assert.match(service, /WHERE id = \? AND instructor_id = \?/, 'Instructor access must be scoped by JWT instructor ID.');
assert.match(service, /WHERE id = \? AND instructor_id = \?[\s\S]*LIMIT 1/, 'Instructor ownership lookup must be bounded.');
assert.match(serviceRoutes, /\/:courseId\/instructor-access'/, 'Direct instructor ownership endpoint must be mounted.');
assert.match(serviceRoutes, /instructor-access/, 'Instructor ownership route must be available to Exam Service.');

assert.match(serviceRoutes, /\/instructor\/:courseId\/progress'[\s\S]*requireInstructor\('Only instructors can view course progress\.'/);
assert.match(gatewayRoutes, /\/instructor\/:courseId\/progress'[\s\S]*req\.user\.role !== 'instructor'/);
assert.match(service, /WHERE id = \? AND instructor_id = \?[\s\S]*FROM enrollments[\s\S]*WHERE course_id = \?/);

assert.match(serviceRoutes, /\/admin\/reports\/courses'[\s\S]*requireAdmin\('Only administrators can view course reports\.'/);
assert.match(serviceRoutes, /\/admin\/:courseId\/status'[\s\S]*requireAdmin\('Only administrators can moderate courses\.'/);
assert.match(serviceRoutes, /\/admin\/:courseId\/category'[\s\S]*requireAdmin\('Only administrators can categorize courses\.'/);
assert.match(gatewayRoutes, /\/admin\/reports\/courses'[\s\S]*req\.user\.role !== 'admin'/);
assert.match(gatewayRoutes, /\/admin\/:courseId\/status'[\s\S]*req\.user\.role !== 'admin'/);
assert.match(gatewayRoutes, /\/admin\/:courseId\/category'[\s\S]*req\.user\.role !== 'admin'/);
assert.match(service, /COURSE_STATUSES = new Set\(\['draft', 'pending_review', 'published', 'rejected'\]\)/);
assert.match(service, /export async function updateAdminCourseCategory/);
assert.match(service, /SET category = \?, updated_at = CURRENT_TIMESTAMP[\s\S]*WHERE id = \? AND status <> 'deleted'/);
assert.match(gatewayProxy, /export async function forwardUpdateCourseCategory/);
assert.match(gatewayProxy, /\/courses\/admin\/\$\{courseIdNum\}\/category/);
assert.match(service, /c\.created_at >= \?/);
assert.match(service, /c\.created_at < DATE_ADD\(\?, INTERVAL 1 DAY\)/);

assert.match(serviceRoutes, /router\.get\('\/categories'/);
assert.match(gatewayRoutes, /router\.get\('\/categories'/);
assert.ok(
  serviceRoutes.indexOf("router.get('/categories'") < serviceRoutes.indexOf("router.get('/:courseId'"),
  'Static category route must precede public course detail route.'
);
assert.ok(
  gatewayRoutes.indexOf("router.get('/categories'") < gatewayRoutes.indexOf("router.get('/:courseId'"),
  'Gateway static category route must precede public course detail route.'
);

assert.match(controller, /getCourses\(\{[\s\S]*search: req\.query\?\.search[\s\S]*maxPrice: req\.query\?\.maxPrice/);
assert.match(gatewayProxy, /buildForwardedQuery\(query, \['search', 'category', 'minPrice', 'maxPrice'\]\)/);
assert.doesNotMatch(service, /PAYMENT_DB|EXAM_DB|USER_DB|payment-db-mysql|exam-db-mysql|user-db-mysql/i);

console.log('COURSE_DOMAIN_HARDENING_PASS');
