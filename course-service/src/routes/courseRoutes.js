import { Router } from 'express';
import { createDraft, createLessonForInstructorDraftHandler, deleteLessonForInstructorDraftHandler, getLessonHandler, getLessonsForInstructorDraftHandler, getCoursesHandler, getEnrolledCoursesHandler, getInstructorDraftsHandler, legacyLessonCreationDeprecatedHandler, publishDraftHandler, updateDraftHandler, updateLessonForInstructorDraftHandler } from '../controllers/courseController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

function requireInstructor(message) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'instructor') {
      return res.status(403).json({ code: 'FORBIDDEN', message });
    }
    next();
  };
}

router.get('/', getCoursesHandler);
router.get('/enrolled', getEnrolledCoursesHandler);
router.get('/drafts/mine', jwtAuth, requireRole('instructor'), getInstructorDraftsHandler);
router.patch('/drafts/:courseId', jwtAuth, requireRole('instructor'), updateDraftHandler);
router.patch('/drafts/:courseId/publish', jwtAuth, requireInstructor('Only instructors can publish courses.'), publishDraftHandler);
router.post('/draft', jwtAuth, requireRole('instructor'), createDraft);
router.post('/drafts/:courseId/lessons', jwtAuth, requireInstructor('Only instructors can create lessons.'), createLessonForInstructorDraftHandler);
router.get('/drafts/:courseId/lessons', jwtAuth, requireInstructor('Only instructors can view lessons for draft courses.'), getLessonsForInstructorDraftHandler);
router.patch('/drafts/:courseId/lessons/:lessonId', jwtAuth, requireInstructor('Only instructors can update lessons.'), updateLessonForInstructorDraftHandler);
router.delete('/drafts/:courseId/lessons/:lessonId', jwtAuth, requireInstructor('Only instructors can delete lessons.'), deleteLessonForInstructorDraftHandler);
router.post('/lessons', legacyLessonCreationDeprecatedHandler);
router.get('/lessons/:lessonId', getLessonHandler);

export default router;
