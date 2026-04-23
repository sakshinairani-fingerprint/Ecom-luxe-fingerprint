import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, price, image_url, category, badge FROM products ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[products]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
