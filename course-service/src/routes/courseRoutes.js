import { Router } from 'express';
import { createDraft, createLessonHandler, getLessonHandler } from '../controllers/courseController.js';

const router = Router();

router.post('/draft', createDraft);
router.post('/lessons', createLessonHandler);
router.get('/lessons/:lessonId', getLessonHandler);

export default router;
