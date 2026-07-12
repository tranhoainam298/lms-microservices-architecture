const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const migration = read('course-service/src/data/migrateLessonProgress.js');
const routes = read('course-service/src/routes/courseRoutes.js');
const controller = read('course-service/src/controllers/courseController.js');
const service = read('course-service/src/services/courseService.js');
const gatewayProxy = read('api-gateway/src/proxy/courseServiceProxy.js');
const lessonPage = read('web-client/src/pages/LessonPage.jsx');

assert.match(migration, /CREATE TABLE IF NOT EXISTS lesson_progress/i);
assert.match(migration, /UNIQUE KEY uq_lesson_progress_student_course_lesson\s*\(student_id, course_id, lesson_id\)/i);
assert.doesNotMatch(migration, /DROP|TRUNCATE|DELETE FROM/i);
assert.match(routes, /router\.get\('\/:courseId\/learning', jwtAuth, requireRole\('student'\)/);
assert.match(routes, /router\.get\('\/lessons\/:lessonId', jwtAuth, requireRole\('student'\)/);
assert.match(routes, /router\.post\('\/lessons\/:lessonId\/complete', jwtAuth, requireRole\('student'\)/);
assert.match(controller, /getStudentCourseLearning\(\{ courseId, studentId: req\.user\.id \}\)/);
assert.match(controller, /completeStudentLesson\(\{ lessonId, studentId: req\.user\.id \}\)/);
assert.match(service, /ON DUPLICATE KEY UPDATE status = 'completed'/);
assert.match(service, /UPDATE enrollments SET progress_percent = \?/);
assert.match(service, /e\.student_id = \? AND e\.status = 'active'/);
assert.doesNotMatch(gatewayProxy.match(/export async function forwardGetCourseLearning[\s\S]*?\n\}/)?.[0] || '', /X-User-Id|X-User-Role/i);
assert.doesNotMatch(lessonPage, /studentId|setTimeout|mockLearningProgress|mockLessons/);
assert.match(lessonPage, /\/courses\/lessons\/\$\{selectedSummary\.id\}\/complete/);
console.log('LESSON_LEARNING_SECURITY_PASS');
