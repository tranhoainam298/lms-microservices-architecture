import rateLimit from 'express-rate-limit';

const windowMs = parseInt(process.env.PASSWORD_CHANGE_RATE_LIMIT_WINDOW_MS, 10) || 900000;
const max = parseInt(process.env.PASSWORD_CHANGE_RATE_LIMIT_MAX, 10) || 5;

export const passwordChangeRateLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => res.status(429).json({
    code: 'PASSWORD_CHANGE_RATE_LIMITED',
    message: 'Too many password change attempts. Please try again later.'
  })
});
