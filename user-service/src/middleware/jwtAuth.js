import jwt from 'jsonwebtoken';
import { pool } from '../data/database.js';

const JWT_SECRET = process.env.JWT_SECRET;

export async function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authorization token is required.' });
  }

  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    const rawUserId = decoded.id !== undefined ? decoded.id : decoded.sub;
    const userId = Number(rawUserId);
    const role = typeof decoded.role === 'string' ? decoded.role.toLowerCase() : '';
    if (!Number.isSafeInteger(userId) || userId <= 0 || !role) {
      return res.status(401).json({ code: 'INVALID_TOKEN', message: 'The access token is invalid or expired.' });
    }

    const [rows] = await pool.query('SELECT status FROM users WHERE id = ? LIMIT 1', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'The user account was not found.' });
    }
    if (rows[0].status !== 'active') {
      return res.status(403).json({ code: 'ACCOUNT_INACTIVE', message: 'This account is not active.' });
    }

    req.user = { ...decoded, id: userId, role };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 'INVALID_TOKEN', message: 'The access token is invalid or expired.' });
    }
    next(error);
  }
}
