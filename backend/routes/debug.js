import express from 'express';
import { FingerprintServerApiClient, Region } from '@fingerprint/node-sdk';
import pool from '../db/index.js';

const router = express.Router();

const FP_KEY = process.env.FP_SECRET_API_KEY;
const fpClient =
  FP_KEY && FP_KEY !== 'your_fingerprint_secret_key_here'
    ? new FingerprintServerApiClient({ apiKey: FP_KEY, region: Region.AP })
    : null;

// ─── GET /api/debug/events ────────────────────────────────────────────────────
// All stored fingerprint events with user info and signals
router.get('/events', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        fe.id,
        fe.event_type,
        fe.event_id,
        fe.visitor_id,
        fe.bot,
        fe.suspect_score,
        fe.incognito,
        fe.vpn,
        fe.proxy,
        fe.ip_address,
        fe.browser,
        fe.os,
        fe.created_at,
        u.email,
        u.name
      FROM fingerprint_events fe
      LEFT JOIN users u ON u.id = fe.user_id
      ORDER BY fe.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[debug/events]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/debug/events/:eventId/raw ──────────────────────────────────────
// Fetch stored raw payload for a specific event
router.get('/events/:eventId/raw', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT raw_payload FROM fingerprint_events WHERE event_id = $1 LIMIT 1',
      [req.params.eventId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found in database.' });
    }
    res.json(result.rows[0].raw_payload);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/debug/events/:eventId/live ─────────────────────────────────────
// Fetch live from Fingerprint API right now
router.get('/events/:eventId/live', async (req, res) => {
  if (!fpClient) {
    return res.status(503).json({ error: 'Fingerprint SDK not configured.' });
  }
  try {
    const event = await fpClient.getEvent(req.params.eventId);
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/debug/users ─────────────────────────────────────────────────────
// All users with their visitor IDs
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, visitor_id, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/debug/redemptions ──────────────────────────────────────────────
// All coupon redemptions with visitor IDs
router.get('/redemptions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        cr.id, cr.coupon_code, cr.visitor_id, cr.redeemed_at,
        u.email, u.name
      FROM coupon_redemptions cr
      LEFT JOIN users u ON u.id = cr.user_id
      ORDER BY cr.redeemed_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
