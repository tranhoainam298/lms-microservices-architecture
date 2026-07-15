const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const activeUiFiles = [
  'web-client/src/App.jsx',
  'web-client/src/components/Header.jsx',
  'web-client/src/components/Sidebar.jsx',
  'web-client/src/pages/LoginPage.jsx',
  'web-client/src/pages/StudentDashboard.jsx',
  'web-client/src/pages/LessonPage.jsx',
  'web-client/src/pages/PaymentPage.jsx',
  'web-client/src/pages/QuizPage.jsx',
  'web-client/src/pages/ProfilePage.jsx',
  'web-client/src/pages/AdminUserManagement.jsx',
  'web-client/src/pages/InstructorCourseDraft.jsx',
  'web-client/src/pages/AdminRevenueReport.jsx',
  'web-client/src/pages/InstructorMonitoring.jsx',
  'web-client/src/pages/AdminCourseOperations.jsx',
  'web-client/src/pages/InstructorDashboard.jsx',
  'web-client/src/pages/AdminDashboard.jsx',
  'web-client/src/pages/CourseDetailPage.jsx',
  'web-client/src/pages/StudentCatalogPage.jsx',
  'web-client/src/pages/StudentLearningPage.jsx',
  'web-client/src/pages/StudentResultsPage.jsx',
  'web-client/src/pages/InstructorCoursesPage.jsx'
];
const banned = [
  'API Gateway', 'Web Client', 'Course Service', 'Course DB', 'Payment Service',
  'Payment DB', 'Exam Service', 'Exam DB', 'User Service', 'User DB',
  'Message Broker', 'RabbitMQ', 'Architecture demo', 'service boundary',
  'database boundary', 'Request Flow', 'Request Ownership', 'External Payment Mock',
  'live service route', 'from the database'
];

for (const relativeFile of activeUiFiles) {
  const source = fs.readFileSync(path.join(root, relativeFile), 'utf8');
  for (const label of banned) {
    assert.equal(source.toLowerCase().includes(label.toLowerCase()), false, `${relativeFile} contains banned label: ${label}`);
  }
}

const appSource = fs.readFileSync(path.join(root, 'web-client/src/App.jsx'), 'utf8');
const sidebarSource = fs.readFileSync(path.join(root, 'web-client/src/components/Sidebar.jsx'), 'utf8');
assert.equal(appSource.includes("from './pages/OverviewPage'"), false, 'Architecture overview must not be reachable from normal routes');
assert.equal(appSource.includes("from './pages/AiSupportPage'"), false, 'AI support must stay inside the authenticated lesson flow');
assert.equal(appSource.includes("case 'overview'"), false, 'Architecture overview route must not be active');
assert.equal(appSource.includes("case 'ai-support'"), false, 'Standalone AI route must not be active');
assert.equal(sidebarSource.includes("id: 'overview'"), false, 'Architecture overview must not appear in navigation');
assert.equal(sidebarSource.includes("id: 'ai-support'"), false, 'Standalone AI page must not appear in navigation');
assert.equal(appSource.includes('mockLearningProgress'), false, 'App must not use mock lesson progress');
console.log('NO_ARCHITECTURE_UI_LABELS_PASS');
