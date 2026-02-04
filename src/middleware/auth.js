// Authentication middleware
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to verify JWT token
 * Attaches user object to req.user if valid
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not defined');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware to require admin role
 * Must be used after authenticateToken
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

/**
 * Optional authentication middleware
 * Attaches user to req if token is valid, but doesn't require it
 * Useful for routes that behave differently for authenticated users
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token && JWT_SECRET) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // Invalid token, continue without user
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
}

/**
 * Generate JWT token for a user
 */
export function generateToken(user) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }

  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
