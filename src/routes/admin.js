// Admin routes
import { Router } from 'express';
import pool from '../db/pool.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /admin/stats
 * Dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Run all queries in parallel
    const [
      cocktailsResult,
      availableResult,
      usersResult,
      ordersResult,
      pendingResult,
      todayResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM cocktails'),
      pool.query('SELECT COUNT(*) FROM cocktails WHERE available = true'),
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query("SELECT COUNT(*) FROM orders WHERE status = 'pending'"),
      pool.query(`
        SELECT COUNT(*) FROM orders
        WHERE created_at >= CURRENT_DATE
      `)
    ]);

    res.json({
      totalCocktails: parseInt(cocktailsResult.rows[0].count),
      availableCocktails: parseInt(availableResult.rows[0].count),
      totalUsers: parseInt(usersResult.rows[0].count),
      totalOrders: parseInt(ordersResult.rows[0].count),
      pendingOrders: parseInt(pendingResult.rows[0].count),
      todayOrders: parseInt(todayResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error GET /admin/stats:', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

/**
 * GET /admin/orders/summary
 * Orders grouped by status
 */
router.get('/orders/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY
        CASE status
          WHEN 'pending' THEN 1
          WHEN 'preparing' THEN 2
          WHEN 'ready' THEN 3
          WHEN 'completed' THEN 4
          WHEN 'cancelled' THEN 5
        END
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error GET /admin/orders/summary:', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération du résumé' });
  }
});

/**
 * GET /admin/cocktails/popular
 * Most ordered cocktails
 */
router.get('/cocktails/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.image,
        COUNT(o.id) as order_count
      FROM cocktails c
      LEFT JOIN orders o ON c.id = o.cocktail_id
      GROUP BY c.id, c.name, c.image
      ORDER BY order_count DESC
      LIMIT $1
    `, [parseInt(limit)]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error GET /admin/cocktails/popular:', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des cocktails populaires' });
  }
});

/**
 * POST /admin/cocktails/toggle-availability
 * Bulk toggle cocktail availability
 * Body: { cocktailIds: string[], available: boolean }
 */
router.post('/cocktails/toggle-availability', async (req, res) => {
  try {
    const { cocktailIds, available } = req.body;

    if (!Array.isArray(cocktailIds) || typeof available !== 'boolean') {
      return res.status(400).json({
        error: 'cocktailIds (array) et available (boolean) sont requis'
      });
    }

    const result = await pool.query(`
      UPDATE cocktails
      SET available = $1
      WHERE id = ANY($2)
      RETURNING id, name, available
    `, [available, cocktailIds]);

    console.log(`✅ Updated availability for ${result.rowCount} cocktails`);
    res.json({
      success: true,
      updated: result.rows
    });
  } catch (error) {
    console.error('Error POST /admin/cocktails/toggle-availability:', error.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

export default router;
