const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const users = read('user-service/src/services/userService.js');
const courses = read('course-service/src/services/courseService.js');
const exams = read('exam-service/Controllers/QuizController.cs');
const examGateway = read('api-gateway/src/routes/examRoutes.js');

for (const field of ['totalUsers', 'students', 'instructors', 'admins', 'activeUsers', 'inactiveUsers']) {
  assert.match(users, new RegExp(`${field}:`), `Admin user summary must include ${field}.`);
}
assert.match(users, /SUM\(CASE WHEN role = 'student' THEN 1 ELSE 0 END\)/);
assert.match(users, /SUM\(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END\)/);

assert.match(courses, /FROM lesson_progress lp[\s\S]*lp\.student_id = \?[\s\S]*lp\.status = 'completed'/,
  'Student learning dashboard counts must come from Course DB lesson progress.');
assert.match(courses, /completed_lessons: Number\(course\.completed_lessons \|\| 0\)/);
assert.match(courses, /total_lessons: Number\(course\.total_lessons \|\| 0\)/);
for (const field of ['totalCourses', 'publishedCourses', 'draftCourses', 'totalEnrollments', 'activeEnrollments', 'uniqueStudents', 'averageProgress']) {
  assert.match(courses, new RegExp(`${field}:`), `Instructor course summary must include ${field}.`);
}
assert.match(courses, /WHERE c\.instructor_id = \? AND c\.status <> 'deleted'/,
  'Instructor dashboard aggregation must stay scoped to the JWT instructor.');

assert.match(exams, /HttpGet\("instructor\/results\/summary"\)/,
  'Exam Service must expose an instructor-owned aggregate result summary.');
assert.match(exams, /Where\(x => x\.InstructorId == UserId\)/,
  'Instructor quiz summary must derive ownership from the verified JWT identity.');
for (const verb of ['HttpPost', 'HttpGet', 'HttpPatch', 'HttpDelete']) {
  assert.match(exams, new RegExp(`${verb}\\(\"courses/\\{courseId\\}/quizzes/\\{quizId\\}/questions`),
    `Question CRUD must include ${verb}.`);
}
assert.match(examGateway, /\/instructor\/results\/summary/);
assert.match(examGateway, /quizzes\/:quizId\/questions\/:questionId/);
assert.doesNotMatch(courses, /PAYMENT_DB|EXAM_DB|USER_DB|payment-db-mysql|exam-db-mysql|user-db-mysql/i);
assert.doesNotMatch(exams, /COURSE_DB|PAYMENT_DB|USER_DB|course-db-mysql|payment-db-mysql|user-db-mysql/i);

console.log('BUSINESS_DASHBOARD_API_PASS');
