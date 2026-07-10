import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { passwordChangeRateLimiter } from '../middleware/passwordChangeRateLimiter.js';
import { forwardChangeOwnPassword, forwardGetOwnProfile, forwardListUsers, forwardUpdateOwnProfile, forwardUpdateUserStatus } from '../proxy/userServiceProxy.js';

const router = Router();

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Only administrators can manage user accounts.' });
  }
  next();
}

function parseUserId(res, value) {
  const text = String(value);
  const userId = Number(text);
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(userId)) {
    res.status(400).json({ code: 'INVALID_USER_ID', message: 'User ID must be a positive integer.' });
    return null;
  }
  return userId;
}

router.get('/me', jwtAuth, async (req, res, next) => {
  try {
    const result = await forwardGetOwnProfile(req.headers.authorization);
    res.status(result.status).json(result.body);
  } catch (error) { next(error); }
});

router.patch('/me', jwtAuth, async (req, res, next) => {
  try {
    const result = await forwardUpdateOwnProfile(req.body, req.headers.authorization);
    res.status(result.status).json(result.body);
  } catch (error) { next(error); }
});

router.patch('/me/password', jwtAuth, passwordChangeRateLimiter, async (req, res, next) => {
  try {
    const result = await forwardChangeOwnPassword(req.body, req.headers.authorization);
    res.status(result.status).json(result.body);
  } catch (error) { next(error); }
});

router.get('/admin/users', jwtAuth, adminOnly, async (req, res, next) => {
  try {
    const result = await forwardListUsers(req.query, req.headers.authorization);
    res.status(result.status).json(result.body);
  } catch (error) { next(error); }
});

router.patch('/admin/users/:userId/status', jwtAuth, adminOnly, async (req, res, next) => {
  try {
    const userId = parseUserId(res, req.params.userId);
    if (userId === null) return;
    const result = await forwardUpdateUserStatus(userId, req.body, req.headers.authorization);
    res.status(result.status).json(result.body);
  } catch (error) { next(error); }
});

export default router;
