const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const controller = read('exam-service/Controllers/QuizController.cs');
const legacySubmitDto = read('exam-service/DTOs/SubmitQuizRequestDto.cs');
const quizResult = read('exam-service/Models/QuizResult.cs');
const schemaMigrator = read('exam-service/Data/ExamSchemaMigrator.cs');
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
assert.match(controller, /private static int\? CorrectOptionIndex\(Question question\)/);
assert.match(controller, /question\.CorrectAnswer/);
assert.match(submitHandler, /CorrectOptionIndex\(map\[a\.QuestionId\]\)/);
assert.match(submitHandler, /StudentId=UserId/);
assert.match(submitHandler, /db\.QuizResults\.Add\(result\)/);
assert.match(submitHandler, /QUIZ_ALREADY_SUBMITTED/);
assert.match(controller, /MySqlException \{ Number: 1062 \}/);
assert.match(submitHandler, /catch \(DbUpdateException exception\) when \(IsDuplicateKey\(exception\)\)/);
assert.doesNotMatch(legacySubmitDto, /StudentId/);
assert.match(quizResult, /\[Column\(TypeName = "json"\)\]\s*public string SubmittedAnswers/);
assert.match(schemaMigrator, /questions WHERE QuizId IS NULL/);
assert.match(schemaMigrator, /ALTER TABLE questions MODIFY COLUMN QuizId INT NOT NULL/);
assert.doesNotMatch(quizPage, /correctAnswer|correctOptionIndex|answerKey|studentId/);
assert.match(quizPage, /JSON\.stringify\(\{ answers:/);
assert.match(quizPage, /ProgressBar value=\{answerProgress\}/);
assert.doesNotMatch(quizPage, /API Gateway|Exam Service|Exam DB|Architecture demo/i);
assert.match(gatewayRoutes, /\/exams\/quizzes|quizzes\/\:quizId|forward/i);

console.log('QUIZ_HARDENING_STATIC_PASS');
