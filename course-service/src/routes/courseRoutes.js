import { Router } from 'express';
import { createDraft } from '../controllers/courseController.js';

const router = Router();

router.post('/draft', createDraft);

export default router;
