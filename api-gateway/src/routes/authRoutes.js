import { Router } from 'express';
import { forwardLogin } from '../proxy/userServiceProxy.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const upstreamResponse = await forwardLogin(req.body);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

export default router;
