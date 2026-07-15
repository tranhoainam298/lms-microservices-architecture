import express from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { forwardExamRequest } from '../proxy/examServiceProxy.js';

const router = express.Router();

const positiveId = (value) => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));
const requireRole = (role, message) => (req, res, next) => req.user.role === role
  ? next()
  : res.status(403).json({ code: 'FORBIDDEN', message });
const validateIds = (req, res, next) => {
  if (req.params.courseId !== undefined && !positiveId(req.params.courseId)) {
    return res.status(400).json({ code: 'INVALID_COURSE_ID', message: 'Course ID must be a positive integer.' });
  }
  if (req.params.quizId !== undefined && !positiveId(req.params.quizId)) {
    return res.status(400).json({ code: 'INVALID_QUIZ_ID', message: 'Quiz ID must be a positive integer.' });
  }
  if (req.params.resultId !== undefined && !positiveId(req.params.resultId)) {
    return res.status(400).json({ code: 'INVALID_RESULT_ID', message: 'Result ID must be a positive integer.' });
  }
  if (req.params.questionId !== undefined && !positiveId(req.params.questionId)) {
    return res.status(400).json({ code: 'INVALID_QUESTION_ID', message: 'Question ID must be a positive integer.' });
  }
  next();
};
const forward = async (req, res, next) => {
  try {
    const upstreamResponse = await forwardExamRequest(req);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) { next(error); }
};

router.use(jwtAuth);
router.post('/courses/:courseId/quizzes', requireRole('instructor', 'Only instructors can manage quizzes.'), validateIds, forward);
router.get('/courses/:courseId/quizzes/mine', requireRole('instructor', 'Only instructors can manage quizzes.'), validateIds, forward);
router.get('/courses/:courseId/quizzes/:quizId/mine', requireRole('instructor', 'Only instructors can manage quizzes.'), validateIds, forward);
router.post('/courses/:courseId/quizzes/:quizId/questions', requireRole('instructor', 'Only instructors can manage questions.'), validateIds, forward);
router.get('/courses/:courseId/quizzes/:quizId/questions/:questionId', requireRole('instructor', 'Only instructors can manage questions.'), validateIds, forward);
router.patch('/courses/:courseId/quizzes/:quizId/questions/:questionId', requireRole('instructor', 'Only instructors can manage questions.'), validateIds, forward);
router.delete('/courses/:courseId/quizzes/:quizId/questions/:questionId', requireRole('instructor', 'Only instructors can manage questions.'), validateIds, forward);
router.patch('/courses/:courseId/quizzes/:quizId', requireRole('instructor', 'Only instructors can manage quizzes.'), validateIds, forward);
router.delete('/courses/:courseId/quizzes/:quizId', requireRole('instructor', 'Only instructors can manage quizzes.'), validateIds, forward);
router.patch('/courses/:courseId/quizzes/:quizId/publish', requireRole('instructor', 'Only instructors can manage quizzes.'), validateIds, forward);
router.get('/courses/:courseId/results/summary', requireRole('instructor', 'Only instructors can view course quiz results.'), validateIds, forward);
router.get('/instructor/results/summary', requireRole('instructor', 'Only instructors can view quiz results.'), forward);
router.get('/courses/:courseId/quizzes', requireRole('student', 'Only students can view published quizzes.'), validateIds, forward);
router.get('/quizzes/:quizId', requireRole('student', 'Only students can take quizzes.'), validateIds, forward);
router.post('/quizzes/:quizId/submit', requireRole('student', 'Only students can submit quizzes.'), validateIds, forward);
router.get('/results/mine', requireRole('student', 'Only students can view quiz results.'), forward);
router.get('/results/:resultId', requireRole('student', 'Only students can view quiz results.'), validateIds, forward);

export default router;
