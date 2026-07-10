import { Router } from 'express';
import { forwardLogin, forwardRegister } from '../proxy/userServiceProxy.js';
import { loginRateLimiter } from '../middleware/loginRateLimiter.js';
import { registerRateLimiter } from '../middleware/registerRateLimiter.js';

const router = Router();

router.post('/login', loginRateLimiter, async (req, res, next) => {
  try {
    const clientIp = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
    const userAgent = req.headers['user-agent'] || '';
    const upstreamResponse = await forwardLogin(req.body, clientIp, userAgent);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

router.post('/register', registerRateLimiter, async (req, res, next) => {
  try {
    const upstreamResponse = await forwardRegister(req.body);
    res.status(upstreamResponse.status).json(upstreamResponse.body);
  } catch (error) {
    next(error);
  }
});

export default router;
