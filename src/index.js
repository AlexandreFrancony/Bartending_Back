// Bartending V2 - Backend API
// Express server with PostgreSQL

// Load environment variables FIRST
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import os from 'os';

// Import database
import pool, { testConnection } from './db/pool.js';

// Import routes
import cocktailsRouter from './routes/cocktails.js';
import customersRouter from './routes/customers.js';
import ordersRouter from './routes/orders.js';
import adminRouter from './routes/admin.js';
import ingredientsRouter from './routes/ingredients.js';

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not defined in .env');
  process.exit(1);
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());
app.use(express.json());

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// API routes
app.use('/cocktails', cocktailsRouter);
app.use('/customers', customersRouter);
app.use('/orders', ordersRouter);
app.use('/admin', adminRouter);
app.use('/ingredients', ingredientsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function startServer() {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot start server without database connection');
      process.exit(1);
    }

    // Start listening
    app.listen(PORT, '0.0.0.0', () => {
      const address = getLocalIP();
      console.log(`\n🍹 Bartending API running on:`);
      console.log(`   Local:   http://localhost:${PORT}`);
      console.log(`   Network: http://${address}:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...');
  await pool.end();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error.message);
  process.exit(1);
});

// Start the server
startServer();
