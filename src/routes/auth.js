// Authentication routes
import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import pool from '../db/pool.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

/**
 * POST /auth/forgot-password
 * Send password reset email
 * Body: { email }
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    // Find user by email
    const result = await pool.query(
      'SELECT id, username, email FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return res.json({ message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
    }

    const user = result.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in database (using a simple approach - add columns to users table)
    await pool.query(
      `UPDATE users
       SET reset_token = $1, reset_token_expiry = $2
       WHERE id = $3`,
      [resetTokenHash, resetTokenExpiry, user.id]
    );

    // Build reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'https://tipsy.francony.fr';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'tipsy@francony.fr',
      to: user.email,
      subject: '🍹 Tipsy - Réinitialisation de mot de passe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Réinitialisation de mot de passe</h2>
          <p>Bonjour <strong>${user.username}</strong>,</p>
          <p>Vous avez demandé à réinitialiser votre mot de passe sur Tipsy.</p>
          <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #3b82f6; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 8px; display: inline-block;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            Ce lien expire dans 1 heure.<br>
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            🍹 Tipsy Bar - Cocktails à domicile
          </p>
        </div>
      `,
    });

    console.log(`✅ Password reset email sent to: ${user.email}`);

    res.json({ message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
  } catch (error) {
    console.error('Error POST /auth/forgot-password:', error.message);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
  }
});

/**
 * POST /auth/reset-password
 * Reset password with token
 * Body: { token, password }
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Le mot de passe doit contenir au moins 8 caractères',
      });
    }

    // Hash the provided token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const result = await pool.query(
      `SELECT id, username FROM users
       WHERE reset_token = $1 AND reset_token_expiry > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Lien invalide ou expiré. Veuillez faire une nouvelle demande.',
      });
    }

    const user = result.rows[0];

    // Hash new password and clear reset token
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await pool.query(
      `UPDATE users
       SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    console.log(`✅ Password reset successful for user: ${user.username}`);

    res.json({ message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' });
  } catch (error) {
    console.error('Error POST /auth/reset-password:', error.message);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe' });
  }
});

export default router;
