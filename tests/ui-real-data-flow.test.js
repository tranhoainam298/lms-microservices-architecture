const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const app = read('web-client/src/App.jsx');
const sidebar = read('web-client/src/components/Sidebar.jsx');
const login = read('web-client/src/pages/LoginPage.jsx');
const studentDashboard = read('web-client/src/pages/StudentDashboard.jsx');
const instructorDashboard = read('web-client/src/pages/InstructorDashboard.jsx');
const instructorMonitoring = read('web-client/src/pages/InstructorMonitoring.jsx');
const adminDashboard = read('web-client/src/pages/AdminDashboard.jsx');
const adminCourseOperations = read('web-client/src/pages/AdminCourseOperations.jsx');
const globalStyles = read('web-client/src/styles/global.css');
const studentApi = read('web-client/src/features/student/api/studentApi.js');
const instructorApi = read('web-client/src/features/instructor/api/instructorApi.js');
const adminApi = read('web-client/src/features/admin/api/adminApi.js');
const mockData = read('web-client/src/data/mockData.js');

assert.match(app, /case 'instructor-dashboard'/, 'Instructor dashboard must be reachable');
assert.match(app, /case 'admin-dashboard'/, 'Admin dashboard must be reachable');
assert.match(app, /activePage === 'course-detail'/, 'Course detail must be reachable from the real catalog');
assert.match(app, /publicPage === 'catalog'/, 'Published catalog must be reachable before sign-in');
assert.match(app, /requiresSignIn/, 'Public course detail must require sign-in before enrollment');
for (const route of ['catalog', 'my-learning', 'quiz-results', 'instructor-courses', 'instructor-results', 'activity-report']) {
  assert.match(app, new RegExp(`case '${route}'`), `${route} must be reachable`);
}
assert.match(app, /<InstructorMonitoring accessToken=\{authSession\.accessToken\} mode="progress" \/>/, 'Students / Progress must render the progress view');
assert.match(app, /<InstructorMonitoring accessToken=\{authSession\.accessToken\} mode="results" \/>/, 'Quiz Results must render the results view');
assert.match(app, /<AdminCourseOperations accessToken=\{authSession\.accessToken\} mode="courses" \/>/, 'Courses / Categories must render the course operations view');
assert.match(app, /<AdminCourseOperations accessToken=\{authSession\.accessToken\} mode="activity" \/>/, 'Activity Report must render the account activity view');
assert.match(sidebar, /id: 'instructor-dashboard'/, 'Instructor navigation must include its dashboard');
assert.match(sidebar, /id: 'admin-dashboard'/, 'Admin navigation must include its dashboard');
for (const label of ['Course Catalog', 'My Learning', 'Quiz Results', 'My Courses', 'Create Course', 'Students / Progress', 'Users', 'Courses / Categories', 'Revenue Report', 'Activity Report']) {
  assert.ok(sidebar.includes(label), `Role navigation must include ${label}`);
}

assert.equal(login.includes('password123'), false, 'Login must not embed a demo password');
assert.ok(login.includes('Browse courses'), 'Login must provide a public catalog action');
assert.equal(/['"][^'"]+@lms\.(edu|demo)['"]/.test(login), false, 'Login must not embed seeded account emails');
assert.equal(mockData.includes('export const mock'), false, 'Frontend must not duplicate seeded datasets');
assert.equal(app.includes('mockData'), false, 'Active application must not import frontend demo data');

for (const endpoint of ['/courses', '/courses/enrolled', '/payments/mine', '/exams/results/mine']) {
  assert.ok(studentApi.includes(endpoint), `Student API layer must call ${endpoint}`);
}
for (const endpoint of ['/courses/instructor/mine', '/exams/instructor/results/summary']) {
  assert.ok(instructorApi.includes(endpoint), `Instructor API layer must call ${endpoint}`);
}
for (const endpoint of ['/users/admin/users', '/courses/admin/reports/courses', '/payments/reports/revenue', '/users/admin/reports/activity']) {
  assert.ok(adminApi.includes(endpoint), `Admin API layer must call ${endpoint}`);
}

for (const realField of ['completed_lessons', 'total_lessons', 'progress_percent', 'quizAttempts']) {
  assert.ok(studentDashboard.includes(realField), `Student dashboard must render real field ${realField}`);
}
for (const realField of ['totalCourses', 'publishedCourses', 'draftCourses', 'uniqueStudents', 'averageProgress', 'attemptCount']) {
  assert.ok(instructorDashboard.includes(realField), `Instructor dashboard must render real field ${realField}`);
}
for (const realField of ['totalUsers', 'students', 'instructors', 'activeUsers', 'inactiveUsers', 'totalRevenue']) {
  assert.ok(adminDashboard.includes(realField), `Admin dashboard must render real field ${realField}`);
}

assert.equal(/studentId\s*:/.test(studentDashboard), false, 'Student UI must not send a student identity');
assert.equal(/mock|fixture|sample data/i.test(instructorDashboard), false, 'Instructor dashboard must not advertise mock data');
assert.equal(/mock|fixture|sample data/i.test(adminDashboard), false, 'Admin dashboard must not advertise mock data');
assert.ok(instructorDashboard.includes("onNavigate('instructor-results')"), 'Instructor quiz CTA must open the distinct quiz results view');
assert.ok(adminDashboard.includes("onNavigate('activity-report')"), 'Admin activity CTA must open the distinct activity report view');
assert.ok(instructorMonitoring.includes("mode === 'results'"), 'Instructor monitoring must explicitly separate progress and results modes');
assert.ok(instructorMonitoring.includes('getCourseProgress'), 'Progress view must use the real course progress endpoint');
assert.ok(instructorMonitoring.includes('getCourseResultSummary'), 'Results view must use the real quiz result endpoint');
assert.ok(adminCourseOperations.includes("mode === 'activity'"), 'Admin operations must explicitly separate course and activity modes');
assert.ok(adminCourseOperations.includes('getCourseReport'), 'Course operations view must use the real course report endpoint');
assert.ok(adminCourseOperations.includes('getActivityReport'), 'Activity report view must use the real activity endpoint');
assert.match(globalStyles, /\.lesson-page__header--premium h2,[\s\S]*?color:\s*#fff/, 'Premium lesson heading must remain readable on its dark header');
assert.match(globalStyles, /\.lesson-player__empty h3\s*\{\s*color:\s*#fff/, 'Lesson placeholder heading must remain readable on its dark stage');

console.log('UI_REAL_DATA_FLOW_PASS');
