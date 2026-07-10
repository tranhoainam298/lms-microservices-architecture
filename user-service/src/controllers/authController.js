import { authenticateUser, registerUser } from '../services/authService.js';

export async function login(req, res) {
  let ipAddress = 'unknown';
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const parts = xForwardedFor.split(',');
    ipAddress = parts[0].trim();
  } else if (req.ip) {
    ipAddress = req.ip;
  } else if (req.socket && req.socket.remoteAddress) {
    ipAddress = req.socket.remoteAddress;
  }

  const userAgent = req.headers['user-agent'] || null;

  const result = await authenticateUser({
    ...(req.body || {}),
    ipAddress,
    userAgent
  });
  res.status(result.status).json(result.body);
}

export async function register(req, res) {
  const result = await registerUser(req.body || {});
  res.status(result.status).json(result.body);
}

