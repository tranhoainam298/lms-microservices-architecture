import { Router } from 'express';
import { changePassword, changeUserStatus, getAdminUsers, getMe, updateMe } from '../controllers/userController.js';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
const adminOnly = requireRole('admin', 'Only administrators can manage user accounts.');

router.get('/me', jwtAuth, getMe);
router.patch('/me', jwtAuth, updateMe);
router.patch('/me/password', jwtAuth, changePassword);
router.get('/admin/users', jwtAuth, adminOnly, getAdminUsers);
router.patch('/admin/users/:userId/status', jwtAuth, adminOnly, changeUserStatus);

export default router;
