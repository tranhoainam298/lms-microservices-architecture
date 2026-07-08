import { authenticateUser } from '../services/authService.js';

export function login(req, res) {
  const result = authenticateUser(req.body || {});
  res.status(result.status).json(result.body);
}
