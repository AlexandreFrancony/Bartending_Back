// Customers routes
import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /customers
 * List all customers
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customers ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error GET /customers:', error.message);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

/**
 * GET /customers/:id
 * Get a customer with their order history
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get customer
    const customerResult = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get their orders
    const ordersResult = await pool.query(`
      SELECT o.*, c.name as cocktail_name, c.image as cocktail_image
      FROM orders o
      JOIN cocktails c ON o.cocktail_id = c.id
      WHERE o.customer_id = $1
      ORDER BY o.created_at DESC
    `, [id]);

    res.json({
      ...customerResult.rows[0],
      orders: ordersResult.rows
    });
  } catch (error) {
    console.error('Error GET /customers/:id:', error.message);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

/**
 * POST /customers
 * Create a new customer
 * Body: { name, email?, phone? }
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await pool.query(`
      INSERT INTO customers (name, email, phone)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name.trim(), email || null, phone || null]);

    console.log(`✅ Created customer: ${result.rows[0].name}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Handle unique constraint violation for email
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Error POST /customers:', error.message);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

/**
 * GET /customers/by-name/:name
 * Find or create customer by name (for quick ordering)
 */
router.get('/by-name/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const trimmedName = name.trim();

    // Try to find existing customer
    let result = await pool.query(
      'SELECT * FROM customers WHERE LOWER(name) = LOWER($1)',
      [trimmedName]
    );

    if (result.rows.length === 0) {
      // Create new customer
      result = await pool.query(
        'INSERT INTO customers (name) VALUES ($1) RETURNING *',
        [trimmedName]
      );
      console.log(`✅ Created new customer: ${trimmedName}`);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error GET /customers/by-name:', error.message);
    res.status(500).json({ error: 'Failed to find/create customer' });
  }
});

export default router;
