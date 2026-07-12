const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const app = read('web-client/src/App.jsx');
const lessonPage = read('web-client/src/pages/LessonPage.jsx');
const gatewayRoutes = read('api-gateway/src/routes/courseRoutes.js');
const gatewayProxy = read('api-gateway/src/proxy/courseServiceProxy.js');
const courseRoutes = read('course-service/src/routes/courseRoutes.js');
const courseController = read('course-service/src/controllers/courseController.js');
const courseService = read('course-service/src/services/courseService.js');
const externalProvider = read('external-systems/ai-chatbot-system/mock-provider/index.js');

const webSource = `${app}\n${lessonPage}`;
assert.doesNotMatch(webSource, /AI_API_KEY|api\.openai\.com|AI_BASE_URL|external-ai-chatbot/i);
assert.doesNotMatch(gatewayRoutes + gatewayProxy, /AI_API_KEY|api\.openai\.com|\/v1\/chat\/completions/i);
assert.doesNotMatch(courseService, /AI_API_KEY|api\.openai\.com|Authorization:\s*`Bearer/i);
assert.match(courseService, /process\.env\.AI_CHATBOT_URL/);
assert.match(courseService, /fetch\(`\$\{aiChatbotUrl\}\/chat`/);
assert.match(externalProvider, /process\.env\.AI_API_KEY/);
assert.match(externalProvider, /\/v1\/chat\/completions/);
assert.match(externalProvider, /AI_PROVIDER_NOT_CONFIGURED/);
assert.doesNotMatch(externalProvider, /mockAiResponse|canned answer|fake answer|setTimeout\([^)]*1500/i);
assert.match(courseRoutes, /router\.post\('\/lessons\/:lessonId\/ai\/ask', jwtAuth, requireRole\('student'\)/);
assert.match(courseController, /studentId:\s*req\.user\.id/);
assert.match(courseService, /e?nrollments[\s\S]*student_id = \?[\s\S]*status = 'active'/i);
assert.match(courseService, /Question must contain between 1 and 1000 characters/);
assert.match(lessonPage, /apiUrl\(`\/courses\/lessons\/\$\{selectedSummary\.id\}\/ai\/ask`\)/);
assert.match(lessonPage, /JSON\.stringify\(\{ question \}\)/);
assert.doesNotMatch(lessonPage, /studentId|password|internal service secret/i);
assert.equal(app.includes("from './pages/AiSupportPage'"), false, 'Standalone canned-answer page must not be active');

for (const banned of ['API Gateway', 'Course Service', 'Course DB', 'AI external system', 'External AI mock', 'service boundary', 'database boundary', 'request flow', 'architecture demo', 'Docker', 'RabbitMQ', 'microservices']) {
  assert.equal(lessonPage.toLowerCase().includes(banned.toLowerCase()), false, `Lesson Viewer contains user-facing architecture label: ${banned}`);
}

console.log('AI_PROVIDER_INTEGRATION_STATIC_PASS');
