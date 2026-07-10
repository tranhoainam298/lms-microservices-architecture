import { Router } from 'express';
import { forwardCreateDraft } from '../proxy/courseServiceProxy.js';
import { jwtAuth } from '../middleware/jwtAuth.js';

const router = Router();

router.post('/draft', jwtAuth, async (req, res, next) => {
  try {
    const upstreamResponse = await forwardCreateDraft(req.body, req.user);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

export default router;
