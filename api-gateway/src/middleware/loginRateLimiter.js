import rateLimit from 'express-rate-limit';

const windowMs = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10) || 900000;
const max = parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 10;

export const loginRateLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      code: 'LOGIN_RATE_LIMITED',
      message: 'Too many failed login attempts. Please try again later.'
    });
  }
});
