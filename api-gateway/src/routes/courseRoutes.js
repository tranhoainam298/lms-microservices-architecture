import { Router } from 'express';
import { forwardCreateDraft } from '../proxy/courseServiceProxy.js';

const router = Router();

router.post('/draft', async (req, res, next) => {
  try {
    const upstreamResponse = await forwardCreateDraft(req.body, req.get('authorization'));
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

export default router;
