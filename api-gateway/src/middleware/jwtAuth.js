import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authorization token is required.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = Number(decoded.id !== undefined ? decoded.id : decoded.sub);
    const role = typeof decoded.role === 'string' ? decoded.role.toLowerCase() : '';
    if (!Number.isSafeInteger(userId) || userId <= 0 || !role) {
      return res.status(401).json({ code: 'INVALID_TOKEN', message: 'The access token is invalid or expired.' });
    }
    req.user = {
      ...decoded,
      id: userId,
      role
    };
    next();
  } catch (error) {
    return res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'The access token is invalid or expired.'
    });
  }
}

