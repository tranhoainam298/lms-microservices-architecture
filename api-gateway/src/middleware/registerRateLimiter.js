import rateLimit from 'express-rate-limit';

const windowMs = parseInt(process.env.REGISTER_RATE_LIMIT_WINDOW_MS, 10) || 3600000;
const max = parseInt(process.env.REGISTER_RATE_LIMIT_MAX, 10) || 5;

export const registerRateLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    code: 'REGISTER_RATE_LIMITED',
    message: 'Too many registration attempts. Please try again later.'
  })
});
