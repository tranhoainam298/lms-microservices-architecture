import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { activateEnrollmentHandler, askAiAboutLessonHandler, checkStudentExamAccessHandler, completeStudentLessonHandler, createDraft, createLessonForInstructorDraftHandler, deleteLessonForInstructorDraftHandler, getLessonHandler, getLessonsForInstructorDraftHandler, getCoursesHandler, getEnrolledCoursesHandler, getInstructorDraftsHandler, getPurchasableCourseHandler, getStudentCourseLearningHandler, legacyLessonCreationDeprecatedHandler, publishDraftHandler, updateDraftHandler, updateLessonForInstructorDraftHandler } from '../controllers/courseController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

function internalServiceAuth(req, res, next) {
  const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;
  const providedSecret = req.get('x-internal-service-secret') || '';
  if (!expectedSecret) {
    return res.status(503).json({ code: 'INTERNAL_AUTH_UNAVAILABLE', message: 'Internal service authentication is unavailable.' });
  }
  const expected = Buffer.from(expectedSecret);
  const provided = Buffer.from(providedSecret);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Internal service authorization is required.' });
  }
  next();
}

function requireInstructor(message) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'instructor') {
      return res.status(403).json({ code: 'FORBIDDEN', message });
    }
    next();
  };
}

router.get('/', getCoursesHandler);
router.get('/enrolled', jwtAuth, requireRole('student'), getEnrolledCoursesHandler);
router.get('/internal/purchasable/:courseId', internalServiceAuth, getPurchasableCourseHandler);
router.post('/internal/enrollments/activate', internalServiceAuth, activateEnrollmentHandler);
router.get('/drafts/mine', jwtAuth, requireRole('instructor'), getInstructorDraftsHandler);
router.get('/:courseId/student-exam-access', jwtAuth, requireRole('student'), checkStudentExamAccessHandler);
router.get('/:courseId/learning', jwtAuth, requireRole('student'), getStudentCourseLearningHandler);
router.patch('/drafts/:courseId', jwtAuth, requireRole('instructor'), updateDraftHandler);
router.patch('/drafts/:courseId/publish', jwtAuth, requireInstructor('Only instructors can publish courses.'), publishDraftHandler);
router.post('/draft', jwtAuth, requireRole('instructor'), createDraft);
router.post('/drafts/:courseId/lessons', jwtAuth, requireInstructor('Only instructors can create lessons.'), createLessonForInstructorDraftHandler);
router.get('/drafts/:courseId/lessons', jwtAuth, requireInstructor('Only instructors can view lessons for draft courses.'), getLessonsForInstructorDraftHandler);
router.patch('/drafts/:courseId/lessons/:lessonId', jwtAuth, requireInstructor('Only instructors can update lessons.'), updateLessonForInstructorDraftHandler);
router.delete('/drafts/:courseId/lessons/:lessonId', jwtAuth, requireInstructor('Only instructors can delete lessons.'), deleteLessonForInstructorDraftHandler);
router.post('/lessons', legacyLessonCreationDeprecatedHandler);
router.get('/lessons/:lessonId', jwtAuth, requireRole('student'), getLessonHandler);
router.post('/lessons/:lessonId/complete', jwtAuth, requireRole('student'), completeStudentLessonHandler);
router.post('/lessons/:lessonId/ai/ask', jwtAuth, requireRole('student'), askAiAboutLessonHandler);

export default router;
