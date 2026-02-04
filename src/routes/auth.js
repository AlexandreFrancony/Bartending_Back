// Authentication routes
import { Router } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/pool.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = Router();
const BCRYPT_ROUNDS = 10;

/**
 * POST /auth/register
 * Create a new user account
 * Body: { username, email, password }
 * Returns: { user, token }
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Nom d\'utilisateur, email et mot de passe requis',
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        error: 'Le nom d\'utilisateur doit contenir au moins 3 caractères',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Le mot de passe doit contenir au moins 8 caractères',
      });
    }

    // Email format validation
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Format d\'email invalide',
      });
    }

    // Check if username or email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Ce nom d\'utilisateur ou email est déjà utilisé',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, username, email, role, created_at`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    console.log(`✅ New user registered: ${username}`);

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Error POST /auth/register:', error.message);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

/**
 * POST /auth/login
 * Authenticate user and return token
 * Body: { login (username or email), password }
 * Returns: { user, token }
 */
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        error: 'Identifiant et mot de passe requis',
      });
    }

    // Find user by username or email
    const result = await pool.query(
      `SELECT id, username, email, password_hash, role
       FROM users
       WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`,
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Identifiant ou mot de passe incorrect',
      });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: 'Identifiant ou mot de passe incorrect',
      });
    }

    // Generate token
    const token = generateToken(user);

    console.log(`✅ User logged in: ${user.username}`);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Error POST /auth/login:', error.message);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

/**
 * GET /auth/me
 * Get current authenticated user info
 * Requires: Bearer token
 * Returns: { user }
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, role, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Error GET /auth/me:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /auth/change-password
 * Change current user's password
 * Requires: Bearer token
 * Body: { currentPassword, newPassword }
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Mot de passe actuel et nouveau mot de passe requis',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe doit contenir au moins 8 caractères',
      });
    }

    // Get current password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(
      currentPassword,
      result.rows[0].password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        error: 'Mot de passe actuel incorrect',
      });
    }

    // Hash and update new password
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    console.log(`✅ Password changed for user: ${req.user.username}`);

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Error POST /auth/change-password:', error.message);
    res.status(500).json({ error: 'Erreur lors du changement de mot de passe' });
  }
});

export default router;
