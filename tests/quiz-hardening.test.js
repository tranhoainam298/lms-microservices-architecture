const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const controller = read('exam-service/Controllers/QuizController.cs');
const gatewayRoutes = read('api-gateway/src/routes/examRoutes.js');
const quizPage = read('web-client/src/pages/QuizPage.jsx');

const loadStart = controller.indexOf('public async Task<IActionResult> Load');
const submitStart = controller.indexOf('public async Task<IActionResult> Submit');
assert.ok(loadStart > 0 && submitStart > loadStart, 'Student load and submit handlers must exist');
const loadHandler = controller.slice(loadStart, submitStart);
const submitHandler = controller.slice(submitStart);

assert.doesNotMatch(loadHandler, /CorrectAnswer|correctOptionIndex|answerKey/);
assert.match(loadHandler, /StudentCourseAccess\(q\.CourseId\)/);
assert.match(submitHandler, /StudentCourseAccess\(quiz\.CourseId\)/);
assert.match(submitHandler, /map\[a\.QuestionId\]\.CorrectAnswer/);
assert.match(submitHandler, /StudentId=UserId/);
assert.match(submitHandler, /db\.QuizResults\.Add\(result\)/);
assert.match(submitHandler, /QUIZ_ALREADY_SUBMITTED/);
assert.doesNotMatch(quizPage, /correctAnswer|correctOptionIndex|answerKey|studentId/);
assert.match(quizPage, /JSON\.stringify\(\{ answers:/);
assert.match(quizPage, /ProgressBar value=\{answerProgress\}/);
assert.doesNotMatch(quizPage, /API Gateway|Exam Service|Exam DB|Architecture demo/i);
assert.match(gatewayRoutes, /\/exams\/quizzes|quizzes\/\:quizId|forward/i);

console.log('QUIZ_HARDENING_STATIC_PASS');
