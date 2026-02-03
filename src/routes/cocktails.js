// Cocktails routes
import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /cocktails
 * List all cocktails with computed availability based on ingredients
 * Query params: ?available=true|false (filters by can_be_made)
 */
router.get('/', async (req, res) => {
  try {
    const { available } = req.query;

    // Use the view that computes availability from ingredients
    let query = `
      SELECT
        id, name, image,
        ingredients_with_stock as ingredients,
        can_be_made as available,
        created_at, updated_at
      FROM cocktails_with_availability
    `;
    const params = [];

    if (available !== undefined) {
      query += ' WHERE can_be_made = $1';
      params.push(available === 'true');
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error GET /cocktails:', error.message);
    res.status(500).json({ error: 'Failed to fetch cocktails' });
  }
});

/**
 * GET /cocktails/:id
 * Get a single cocktail by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM cocktails WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cocktail not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error GET /cocktails/:id:', error.message);
    res.status(500).json({ error: 'Failed to fetch cocktail' });
  }
});

/**
 * PATCH /cocktails/:id
 * Update cocktail (availability, name, ingredients)
 * Body: { available?: boolean, name?: string, ingredients?: array }
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { available, name, ingredients } = req.body;

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (available !== undefined) {
      updates.push(`available = $${paramIndex++}`);
      params.push(available);
    }

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }

    if (ingredients !== undefined) {
      updates.push(`ingredients = $${paramIndex++}`);
      params.push(JSON.stringify(ingredients));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    const query = `
      UPDATE cocktails
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cocktail not found' });
    }

    console.log(`✅ Updated cocktail: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error PATCH /cocktails/:id:', error.message);
    res.status(500).json({ error: 'Failed to update cocktail' });
  }
});

export default router;
