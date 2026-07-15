import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { changePassword, changeUserRole, changeUserStatus, getAdminLoginActivity, getAdminUsers, getInternalProfilesHandler, getMe, updateMe } from '../controllers/userController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
const adminOnly = requireRole('admin', 'Only administrators can manage user accounts.');

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

router.get('/internal/profiles', internalServiceAuth, getInternalProfilesHandler);
router.get('/me', jwtAuth, getMe);
router.patch('/me', jwtAuth, updateMe);
router.patch('/me/password', jwtAuth, changePassword);
router.get('/admin/users', jwtAuth, adminOnly, getAdminUsers);
router.patch('/admin/users/:userId/status', jwtAuth, adminOnly, changeUserStatus);
router.patch('/admin/users/:userId/role', jwtAuth, adminOnly, changeUserRole);
router.get('/admin/reports/activity', jwtAuth, adminOnly, getAdminLoginActivity);

export default router;
