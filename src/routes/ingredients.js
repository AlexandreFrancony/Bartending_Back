// Ingredients routes
import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /ingredients
 * List all ingredients with their stock status
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM available_ingredients
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error GET /ingredients:', error.message);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

/**
 * PATCH /ingredients/:id
 * Update ingredient stock status
 * Body: { in_stock: boolean }
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { in_stock } = req.body;

    if (typeof in_stock !== 'boolean') {
      return res.status(400).json({ error: 'in_stock must be a boolean' });
    }

    const result = await pool.query(`
      UPDATE available_ingredients
      SET in_stock = $1
      WHERE id = $2
      RETURNING *
    `, [in_stock, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    console.log(`✅ Ingredient ${result.rows[0].name}: ${in_stock ? 'in stock' : 'out of stock'}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error PATCH /ingredients/:id:', error.message);
    res.status(500).json({ error: 'Failed to update ingredient' });
  }
});

/**
 * POST /ingredients/toggle
 * Toggle stock status for an ingredient by name
 * Body: { name: string, in_stock: boolean }
 */
router.post('/toggle', async (req, res) => {
  try {
    const { name, in_stock } = req.body;

    if (!name || typeof in_stock !== 'boolean') {
      return res.status(400).json({ error: 'name and in_stock (boolean) are required' });
    }

    const result = await pool.query(`
      UPDATE available_ingredients
      SET in_stock = $1
      WHERE LOWER(name) = LOWER($2)
      RETURNING *
    `, [in_stock, name]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    console.log(`✅ ${name}: ${in_stock ? 'in stock' : 'out of stock'}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error POST /ingredients/toggle:', error.message);
    res.status(500).json({ error: 'Failed to toggle ingredient' });
  }
});

/**
 * POST /ingredients/bulk-update
 * Update multiple ingredients at once
 * Body: { ingredients: [{ id: number, in_stock: boolean }] }
 */
router.post('/bulk-update', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'ingredients must be an array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const ing of ingredients) {
        await client.query(
          'UPDATE available_ingredients SET in_stock = $1 WHERE id = $2',
          [ing.in_stock, ing.id]
        );
      }

      await client.query('COMMIT');

      // Fetch updated list
      const result = await client.query('SELECT * FROM available_ingredients ORDER BY name');
      console.log(`✅ Bulk updated ${ingredients.length} ingredients`);
      res.json(result.rows);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error POST /ingredients/bulk-update:', error.message);
    res.status(500).json({ error: 'Failed to bulk update ingredients' });
  }
});

/**
 * POST /ingredients
 * Add a new ingredient
 * Body: { name: string, in_stock?: boolean }
 */
router.post('/', async (req, res) => {
  try {
    const { name, in_stock = true } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const result = await pool.query(`
      INSERT INTO available_ingredients (name, in_stock)
      VALUES ($1, $2)
      RETURNING *
    `, [name.trim(), in_stock]);

    console.log(`✅ Added ingredient: ${name}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ingredient already exists' });
    }
    console.error('Error POST /ingredients:', error.message);
    res.status(500).json({ error: 'Failed to add ingredient' });
  }
});

export default router;
