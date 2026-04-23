import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRouter from './routes/auth.js';
import couponRouter from './routes/coupon.js';
import productsRouter from './routes/products.js';
import orderRouter from './routes/order.js';
import debugRouter from './routes/debug.js';
import webhookRouter from './routes/webhook.js';
import pool from './db/index.js';

// Load .env from the backend directory regardless of where Node is invoked from
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

// Run schema migrations on startup (idempotent — uses CREATE TABLE IF NOT EXISTS)
async function runMigrations() {
  try {
    const sql = readFileSync(join(__dirname, 'db/schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅  Database schema up to date');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
// Webhook must be registered BEFORE express.json() so the route
// receives the raw Buffer needed for HMAC signature verification.
app.use('/api/webhook', webhookRouter);

app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/coupon', couponRouter);
app.use('/api/products', productsRouter);
app.use('/api/order', orderRouter);
app.use('/api/debug', debugRouter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`\n🚀  LUXE backend running at http://localhost:${PORT}`);
  console.log(`📦  Database: ${process.env.DATABASE_URL ? 'connected' : 'not configured'}`);
  console.log(
    `🔒  Fingerprint: ${
      process.env.FP_SECRET_API_KEY && process.env.FP_SECRET_API_KEY !== 'your_fingerprint_secret_key_here'
        ? 'configured ✓'
        : 'not configured (fraud checks disabled)'
    }\n`
  );
  await runMigrations();
});
