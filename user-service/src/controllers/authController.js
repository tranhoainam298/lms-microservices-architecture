import { authenticateUser, registerUser } from '../services/authService.js';

export async function login(req, res) {
  const result = await authenticateUser(req.body || {});
  res.status(result.status).json(result.body);
}

export async function register(req, res) {
  const result = await registerUser(req.body || {});
  res.status(result.status).json(result.body);
}

