// User management routes (admin only)
import { Router } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/pool.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();
const BCRYPT_ROUNDS = 10;

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /users
 * List all users (admin only)
 * Returns: Array of users (without password hashes)
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error GET /users:', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

/**
 * GET /users/:id
 * Get a specific user (admin only)
 * Returns: User object
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, username, email, role, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error GET /users/:id:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /users/:id
 * Update user role (admin only)
 * Body: { role: 'user' | 'admin' }
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Rôle invalide. Utilisez "user" ou "admin"',
      });
    }

    // Prevent admin from demoting themselves
    if (parseInt(id) === req.user.id && role !== 'admin') {
      return res.status(400).json({
        error: 'Vous ne pouvez pas modifier votre propre rôle',
      });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, username, email, role, updated_at`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    console.log(`✅ User ${result.rows[0].username} role changed to ${role}`);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error PATCH /users/:id:', error.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * DELETE /users/:id
 * Delete a user (admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        error: 'Vous ne pouvez pas supprimer votre propre compte',
      });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING username',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    console.log(`✅ User deleted: ${result.rows[0].username}`);

    res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    console.error('Error DELETE /users/:id:', error.message);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

/**
 * POST /users/:id/reset-password
 * Admin reset a user's password (admin only)
 * Body: { newPassword }
 */
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: 'Le mot de passe doit contenir au moins 8 caractères',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    const result = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING username`,
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    console.log(`✅ Password reset for user: ${result.rows[0].username}`);

    res.json({ message: 'Mot de passe réinitialisé' });
  } catch (error) {
    console.error('Error POST /users/:id/reset-password:', error.message);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

export default router;
