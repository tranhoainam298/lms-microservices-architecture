import { Router } from 'express';
import { createDraft, createLessonHandler, getLessonHandler, getCoursesHandler, getEnrolledCoursesHandler } from '../controllers/courseController.js';

const router = Router();

router.get('/', getCoursesHandler);
router.get('/enrolled', getEnrolledCoursesHandler);
router.post('/draft', createDraft);
router.post('/lessons', createLessonHandler);
router.get('/lessons/:lessonId', getLessonHandler);

export default router;
