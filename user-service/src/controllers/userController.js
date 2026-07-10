import { changeOwnPassword, getOwnProfile, listUsers, updateOwnProfile, updateUserStatus } from '../services/userService.js';

function parseUserId(res, value) {
  const text = String(value);
  const userId = Number(text);
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(userId)) {
    res.status(400).json({ code: 'INVALID_USER_ID', message: 'User ID must be a positive integer.' });
    return null;
  }
  return userId;
}

export async function getMe(req, res) {
  const result = await getOwnProfile(req.user.id);
  res.status(result.status).json(result.body);
}

export async function updateMe(req, res) {
  const result = await updateOwnProfile({ userId: req.user.id, fullName: req.body?.fullName });
  res.status(result.status).json(result.body);
}

export async function changePassword(req, res) {
  const result = await changeOwnPassword({
    userId: req.user.id,
    currentPassword: req.body?.currentPassword,
    newPassword: req.body?.newPassword
  });
  res.status(result.status).json(result.body);
}

export async function getAdminUsers(req, res) {
  const result = await listUsers(req.query || {});
  res.status(result.status).json(result.body);
}

export async function changeUserStatus(req, res) {
  const userId = parseUserId(res, req.params.userId);
  if (userId === null) return;
  const result = await updateUserStatus({ adminId: req.user.id, userId, status: req.body?.status });
  res.status(result.status).json(result.body);
}
