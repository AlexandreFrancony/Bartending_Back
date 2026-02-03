// Database connection pool for PostgreSQL
import pg from 'pg';

const { Pool } = pg;

// Create connection pool from DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Pool configuration optimized for Raspberry Pi
  max: 10,                // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log connection events
pool.on('connect', () => {
  console.log('📦 New database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err.message);
});

// Helper function to test connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connected at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Export pool for queries
export default pool;
