import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { activateEnrollmentHandler, askAiAboutLessonHandler, checkInstructorCourseAccessHandler, checkStudentExamAccessHandler, completeStudentLessonHandler, createDraft, createLessonForInstructorDraftHandler, deleteDraftHandler, deleteLessonForInstructorDraftHandler, enrollInFreeCourseHandler, getAdminCourseReportHandler, getCourseTitlesInternalHandler, getInstructorCourseProgressHandler, getInstructorCoursesHandler, getLessonHandler, getLessonsForInstructorDraftHandler, getCoursesHandler, getEnrolledCoursesHandler, getInstructorDraftsHandler, getPublishedCourseCategoriesHandler, getPublishedCourseDetailHandler, getPurchasableCourseHandler, getStudentCourseLearningHandler, legacyLessonCreationDeprecatedHandler, moderateCourseStatusHandler, publishDraftHandler, reorderLessonsForInstructorDraftHandler, updateAdminCourseCategoryHandler, updateDraftHandler, updateLessonForInstructorDraftHandler } from '../controllers/courseController.js';
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

function requireAdmin(message) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ code: 'FORBIDDEN', message });
    }
    next();
  };
}

router.get('/', getCoursesHandler);
router.get('/categories', getPublishedCourseCategoriesHandler);
router.get('/enrolled', jwtAuth, requireRole('student'), getEnrolledCoursesHandler);
router.get('/internal/purchasable/:courseId', internalServiceAuth, getPurchasableCourseHandler);
router.post('/internal/enrollments/activate', internalServiceAuth, activateEnrollmentHandler);
router.get('/internal/titles', internalServiceAuth, getCourseTitlesInternalHandler);
router.get('/admin/reports/courses', jwtAuth, requireAdmin('Only administrators can view course reports.'), getAdminCourseReportHandler);
router.patch('/admin/:courseId/status', jwtAuth, requireAdmin('Only administrators can moderate courses.'), moderateCourseStatusHandler);
router.patch('/admin/:courseId/category', jwtAuth, requireAdmin('Only administrators can categorize courses.'), updateAdminCourseCategoryHandler);
router.get('/drafts/mine', jwtAuth, requireRole('instructor'), getInstructorDraftsHandler);
router.get('/instructor/mine', jwtAuth, requireInstructor('Only instructors can view their courses.'), getInstructorCoursesHandler);
router.get('/instructor/:courseId/progress', jwtAuth, requireInstructor('Only instructors can view course progress.'), getInstructorCourseProgressHandler);
router.get('/:courseId/student-exam-access', jwtAuth, requireRole('student'), checkStudentExamAccessHandler);
router.get('/:courseId/instructor-access', jwtAuth, requireInstructor('Only instructors can verify course ownership.'), checkInstructorCourseAccessHandler);
router.get('/:courseId/learning', jwtAuth, requireRole('student'), getStudentCourseLearningHandler);
router.post('/:courseId/enroll', jwtAuth, requireRole('student'), enrollInFreeCourseHandler);
router.patch('/drafts/:courseId', jwtAuth, requireRole('instructor'), updateDraftHandler);
router.delete('/drafts/:courseId', jwtAuth, requireInstructor('Only instructors can delete course drafts.'), deleteDraftHandler);
router.patch('/drafts/:courseId/publish', jwtAuth, requireInstructor('Only instructors can publish courses.'), publishDraftHandler);
router.post('/draft', jwtAuth, requireRole('instructor'), createDraft);
router.post('/drafts/:courseId/lessons', jwtAuth, requireInstructor('Only instructors can create lessons.'), createLessonForInstructorDraftHandler);
router.get('/drafts/:courseId/lessons', jwtAuth, requireInstructor('Only instructors can view lessons for draft courses.'), getLessonsForInstructorDraftHandler);
router.patch('/drafts/:courseId/lessons/reorder', jwtAuth, requireInstructor('Only instructors can reorder lessons.'), reorderLessonsForInstructorDraftHandler);
router.patch('/drafts/:courseId/lessons/:lessonId', jwtAuth, requireInstructor('Only instructors can update lessons.'), updateLessonForInstructorDraftHandler);
router.delete('/drafts/:courseId/lessons/:lessonId', jwtAuth, requireInstructor('Only instructors can delete lessons.'), deleteLessonForInstructorDraftHandler);
router.post('/lessons', legacyLessonCreationDeprecatedHandler);
router.get('/lessons/:lessonId', jwtAuth, requireRole('student'), getLessonHandler);
router.post('/lessons/:lessonId/complete', jwtAuth, requireRole('student'), completeStudentLessonHandler);
router.post('/lessons/:lessonId/ai/ask', jwtAuth, requireRole('student'), askAiAboutLessonHandler);
router.get('/:courseId', getPublishedCourseDetailHandler);

export default router;
