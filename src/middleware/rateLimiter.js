// Rate limiting middleware
import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Trop de tentatives, veuillez réessayer dans 15 minutes' },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * General API rate limiter
 * Prevents abuse of the API
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Trop de requêtes, veuillez ralentir' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter limiter for sensitive operations
 * Like password changes, account deletion, etc.
 */
export const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  message: { error: 'Trop de tentatives pour cette opération' },
  standardHeaders: true,
  legacyHeaders: false,
});
