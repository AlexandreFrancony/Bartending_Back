// Orders routes
import { Router } from 'express';
import pool from '../db/pool.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

/**
 * GET /orders
 * List all orders with user and cocktail info
 * Admin only - regular users can only see their own orders via /orders/my
 * Query params: ?status=pending|preparing|ready|completed|cancelled
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT
        o.id,
        o.status,
        o.notes,
        o.created_at,
        o.completed_at,
        o.user_id,
        u.username as user_name,
        o.cocktail_id,
        ck.name as cocktail_name,
        ck.image as cocktail_image,
        ck.ingredients as cocktail_ingredients
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN cocktails ck ON o.cocktail_id = ck.id
    `;

    const params = [];

    if (status) {
      query += ' WHERE o.status = $1';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error GET /orders:', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
  }
});

/**
 * GET /orders/my
 * List current user's orders
 * Requires authentication
 */
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.status,
        o.notes,
        o.created_at,
        o.completed_at,
        o.cocktail_id,
        ck.name as cocktail_name,
        ck.image as cocktail_image
      FROM orders o
      JOIN cocktails ck ON o.cocktail_id = ck.id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error GET /orders/my:', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération de vos commandes' });
  }
});

/**
 * POST /orders
 * Create a new order for the authenticated user
 * Requires authentication
 * Body: { cocktailId, notes? }
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { cocktailId, notes } = req.body;
    const userId = req.user.id;

    // Validation
    if (!cocktailId) {
      return res.status(400).json({ error: 'cocktailId est requis' });
    }

    // Verify cocktail exists and is available
    const cocktailResult = await pool.query(
      'SELECT * FROM cocktails WHERE id = $1',
      [cocktailId]
    );

    if (cocktailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cocktail non trouvé' });
    }

    const cocktail = cocktailResult.rows[0];
    if (!cocktail.available) {
      return res.status(400).json({ error: 'Ce cocktail n\'est pas disponible' });
    }

    // Create order
    const orderResult = await pool.query(`
      INSERT INTO orders (user_id, cocktail_id, notes, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *
    `, [userId, cocktailId, notes || null]);

    console.log(`✅ Order: ${req.user.username} → ${cocktail.name}`);

    // Return order with full details
    res.status(201).json({
      ...orderResult.rows[0],
      user_name: req.user.username,
      cocktail_name: cocktail.name,
      cocktail_image: cocktail.image
    });
  } catch (error) {
    console.error('Error POST /orders:', error.message);
    res.status(500).json({ error: 'Erreur lors de la création de la commande' });
  }
});

/**
 * PATCH /orders/:id
 * Update order status (admin only)
 * Body: { status: 'pending'|'preparing'|'ready'|'completed'|'cancelled' }
 */
router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Statut invalide. Doit être: ${validStatuses.join(', ')}`
      });
    }

    const result = await pool.query(`
      UPDATE orders
      SET status = $1
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    console.log(`✅ Order ${id} → ${status}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error PATCH /orders/:id:', error.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * DELETE /orders/:id
 * Delete a specific order (admin only)
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM orders WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    console.log(`✅ Deleted order: ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error DELETE /orders/:id:', error.message);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

/**
 * DELETE /orders
 * Delete all orders (admin only)
 */
router.delete('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM orders RETURNING id');

    console.log(`✅ Deleted ${result.rowCount} orders`);
    res.json({ success: true, deletedCount: result.rowCount });
  } catch (error) {
    console.error('Error DELETE /orders:', error.message);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

export default router;
