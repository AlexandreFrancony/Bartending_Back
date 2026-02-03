// Orders routes
import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * GET /orders
 * List all orders with customer and cocktail info
 * Query params: ?status=pending|preparing|ready|completed|cancelled
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT
        o.id,
        o.status,
        o.notes,
        o.created_at,
        o.completed_at,
        o.customer_id,
        c.name as customer_name,
        o.cocktail_id,
        ck.name as cocktail_name,
        ck.image as cocktail_image,
        ck.ingredients as cocktail_ingredients
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
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
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * POST /orders
 * Create a new order
 * Body: { customerName, cocktailId, notes? }
 */
router.post('/', async (req, res) => {
  try {
    const { customerName, cocktailId, notes } = req.body;

    // Validation
    if (!customerName || !cocktailId) {
      return res.status(400).json({ error: 'customerName and cocktailId are required' });
    }

    // Verify cocktail exists and is available
    const cocktailResult = await pool.query(
      'SELECT * FROM cocktails WHERE id = $1',
      [cocktailId]
    );

    if (cocktailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cocktail not found' });
    }

    const cocktail = cocktailResult.rows[0];
    if (!cocktail.available) {
      return res.status(400).json({ error: 'Cocktail is not available' });
    }

    // Find or create customer
    let customerResult = await pool.query(
      'SELECT * FROM customers WHERE LOWER(name) = LOWER($1)',
      [customerName.trim()]
    );

    let customerId;
    if (customerResult.rows.length === 0) {
      // Create new customer
      customerResult = await pool.query(
        'INSERT INTO customers (name) VALUES ($1) RETURNING *',
        [customerName.trim()]
      );
      customerId = customerResult.rows[0].id;
      console.log(`✅ New customer: ${customerName.trim()}`);
    } else {
      customerId = customerResult.rows[0].id;
    }

    // Create order
    const orderResult = await pool.query(`
      INSERT INTO orders (customer_id, cocktail_id, notes, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *
    `, [customerId, cocktailId, notes || null]);

    console.log(`✅ Order: ${customerName} → ${cocktail.name}`);

    // Return order with full details
    res.status(201).json({
      ...orderResult.rows[0],
      customer_name: customerName.trim(),
      cocktail_name: cocktail.name,
      cocktail_image: cocktail.image
    });
  } catch (error) {
    console.error('Error POST /orders:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * PATCH /orders/:id
 * Update order status
 * Body: { status: 'pending'|'preparing'|'ready'|'completed'|'cancelled' }
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await pool.query(`
      UPDATE orders
      SET status = $1
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log(`✅ Order ${id} → ${status}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error PATCH /orders/:id:', error.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

/**
 * DELETE /orders/:id
 * Delete a specific order
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM orders WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log(`✅ Deleted order: ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error DELETE /orders/:id:', error.message);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

/**
 * DELETE /orders
 * Delete all orders (admin function)
 */
router.delete('/', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM orders RETURNING id');

    console.log(`✅ Deleted ${result.rowCount} orders`);
    res.json({ success: true, deletedCount: result.rowCount });
  } catch (error) {
    console.error('Error DELETE /orders:', error.message);
    res.status(500).json({ error: 'Failed to delete orders' });
  }
});

export default router;
