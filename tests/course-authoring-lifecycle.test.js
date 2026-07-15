import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const service = read('course-service/src/services/courseService.js');
const controller = read('course-service/src/controllers/courseController.js');
const courseRoutes = read('course-service/src/routes/courseRoutes.js');
const gatewayRoutes = read('api-gateway/src/routes/courseRoutes.js');
const gatewayProxy = read('api-gateway/src/proxy/courseServiceProxy.js');
const instructorUi = read('web-client/src/pages/InstructorCourseDraft.jsx');

assert.match(courseRoutes, /router\.delete\('\/drafts\/:courseId', jwtAuth, requireInstructor/);
assert.match(courseRoutes, /router\.patch\('\/drafts\/:courseId\/lessons\/reorder', jwtAuth, requireInstructor/);
assert.match(controller, /deleteInstructorDraft\(\{\s*courseId,\s*instructorId: req\.user\.id\s*\}\)/s);
assert.match(controller, /reorderLessonsForInstructorDraft\(\{\s*courseId,\s*instructorId: req\.user\.id,\s*lessonIds: req\.body\?\.lessonIds/s);

const deleteFunction = service.slice(
  service.indexOf('export async function deleteInstructorDraft'),
  service.indexOf('export async function getStudentCourseLearning')
);
assert.match(deleteFunction, /status = 'deleted'/);
assert.match(deleteFunction, /status = 'draft'/);
assert.match(deleteFunction, /FROM enrollments WHERE course_id = \?/);
assert.match(deleteFunction, /COURSE_DELETE_NOT_ALLOWED/);
assert.doesNotMatch(deleteFunction, /DELETE\s+FROM\s+courses/i);
assert.doesNotMatch(deleteFunction, /DELETE\s+FROM\s+lessons/i);

const reorderFunction = service.slice(
  service.indexOf('export async function reorderLessonsForInstructorDraft'),
  service.indexOf('export async function checkInstructorCourseAccess')
);
assert.match(reorderFunction, /beginTransaction\(\)/);
assert.match(reorderFunction, /FOR UPDATE/);
assert.match(reorderFunction, /LESSON_ORDER_MISMATCH/);
assert.match(reorderFunction, /new Set\(normalizedIds\)/);
assert.match(reorderFunction, /-\(index \+ 1\)/);
assert.match(reorderFunction, /index \+ 1, normalizedIds\[index\]/);

assert.match(gatewayRoutes, /router\.delete\('\/drafts\/:courseId', jwtAuth/);
assert.match(gatewayRoutes, /router\.patch\('\/drafts\/:courseId\/lessons\/reorder', jwtAuth/);
assert.match(gatewayProxy, /method: 'DELETE'/);
assert.match(gatewayProxy, /lessons\/reorder/);
assert.match(instructorUi, /method: 'DELETE'/);
assert.match(instructorUi, /body: JSON\.stringify\(\{ lessonIds: reordered\.map\(item => item\.id\) \}\)/);
assert.doesNotMatch(instructorUi, /studentId/);

console.log('Course authoring lifecycle checks passed.');
