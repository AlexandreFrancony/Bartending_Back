// Bartending V2 - Backend API
// Express server with PostgreSQL

// Load environment variables FIRST
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import os from 'os';

// Import database
import pool, { testConnection } from './db/pool.js';

// Import middleware
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';

// Import routes
import cocktailsRouter from './routes/cocktails.js';
import ordersRouter from './routes/orders.js';
import adminRouter from './routes/admin.js';
import ingredientsRouter from './routes/ingredients.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Verify required environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not defined in .env');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET is not defined in .env');
  process.exit(1);
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || true // Allow configured frontend or all in production if not set
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Apply general rate limiting to all API routes
app.use('/api', apiLimiter);

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

// Health check (public, no rate limit)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// Authentication routes (with stricter rate limiting)
app.use('/auth', authLimiter, authRouter);

// API routes
app.use('/cocktails', cocktailsRouter);
app.use('/orders', ordersRouter);
app.use('/admin', adminRouter);
app.use('/ingredients', ingredientsRouter);
app.use('/users', usersRouter);

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
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Auth: JWT-based authentication enabled\n`);
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
