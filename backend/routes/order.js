import express from 'express';
import jwt from 'jsonwebtoken';
import { FingerprintServerApiClient, Region } from '@fingerprint/node-sdk';
import pool from '../db/index.js';
import { logFpEvent, logFpError } from '../utils/fpLogger.js';
import { unsealFpEvent, isSealedConfigured } from '../utils/unsealFpEvent.js';

const router = express.Router();

const FP_KEY = process.env.FP_SECRET_API_KEY;
const fpClient =
  FP_KEY && FP_KEY !== 'your_fingerprint_secret_key_here'
    ? new FingerprintServerApiClient({ apiKey: FP_KEY, region: Region.AP })
    : null;

async function getFpEvent(eventId, sealedResult) {
  if (sealedResult && isSealedConfigured) {
    return await unsealFpEvent(sealedResult);
  }
  if (!fpClient || !eventId) return null;
  try {
    return await fpClient.getEvent(eventId);
  } catch (err) {
    console.warn('[Fingerprint] getEvent failed:', err.message);
    return null;
  }
}

async function saveOrder({ userId, visitorId, fingerprintEventId, items, total, couponCode, status, rejectionReason }) {
  try {
    await pool.query(
      `INSERT INTO orders
         (user_id, visitor_id, fingerprint_event_id, items, total, coupon_code, status, rejection_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, visitorId, fingerprintEventId, JSON.stringify(items ?? []), total ?? 0, couponCode ?? null, status, rejectionReason ?? null]
    );
  } catch (err) {
    console.warn('[Orders] Failed to save order:', err.message);
  }
}

// ─── POST /api/order/place ────────────────────────────────────────────────────
router.post('/place', async (req, res) => {
  // Auth
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  let decoded;
  try {
    decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  const { fingerprintEventId, sealedResult, otpCode, items, total, couponCode } = req.body;

  if (fpClient && !fingerprintEventId && !sealedResult) {
    await saveOrder({
      userId: decoded.userId,
      status: 'rejected',
      rejectionReason: 'missing_fingerprint',
      items, total, couponCode,
    });
    return res.status(403).json({
      error: 'Order blocked: device verification required.',
      reason: 'missing_fingerprint',
    });
  }

  let visitorId = null;

  if (fingerprintEventId || sealedResult) {
    const fpEvent = await getFpEvent(fingerprintEventId, sealedResult);

    if (!fpEvent) {
      logFpError('ORDER', 'getEvent returned null — event ID may be invalid or expired');
      await saveOrder({
        userId: decoded.userId, fingerprintEventId,
        status: 'rejected', rejectionReason: 'fingerprint_lookup_failed',
        items, total, couponCode,
      });
      return res.status(403).json({
        error: 'Order blocked: could not verify device.',
        reason: 'fingerprint_lookup_failed',
      });
    }

    if (fpEvent.bot === 'bad') {
      logFpEvent('ORDER', fpEvent, 'bot detected — order blocked', true);
      await saveOrder({
        userId: decoded.userId, visitorId: fpEvent.identification?.visitor_id, fingerprintEventId,
        status: 'rejected', rejectionReason: 'bot_detected',
        items, total, couponCode,
      });
      return res.status(403).json({
        error: 'Order blocked: automated bot activity detected.',
        reason: 'bot_detected',
      });
    }

    if (fpEvent.incognito === true) {
      logFpEvent('ORDER', fpEvent, 'incognito — order blocked', true);
      await saveOrder({
        userId: decoded.userId, visitorId: fpEvent.identification?.visitor_id, fingerprintEventId,
        status: 'rejected', rejectionReason: 'incognito_detected',
        items, total, couponCode,
      });
      return res.status(403).json({
        error: 'Order blocked: orders cannot be placed in private/incognito browsing.',
        reason: 'incognito_detected',
      });
    }

    visitorId = fpEvent.identification?.visitor_id ?? null;

    // Phase 2: OTP submitted — place the order
    if (otpCode !== undefined) {
      if (!/^\d{6}$/.test(String(otpCode))) {
        return res.status(400).json({ error: 'OTP must be exactly 6 digits.' });
      }
      if (visitorId) {
        await pool.query(
          `INSERT INTO verified_visitors (visitor_id, user_id)
           VALUES ($1, $2) ON CONFLICT (visitor_id) DO NOTHING`,
          [visitorId, decoded.userId]
        );
      }
      await saveOrder({
        userId: decoded.userId, visitorId, fingerprintEventId,
        status: 'placed',
        items, total, couponCode,
      });
      logFpEvent('ORDER', fpEvent, 'OTP verified — order placed');
      return res.json({ success: true });
    }

    // Phase 1: check if visitor is already trusted
    if (visitorId) {
      const existing = await pool.query(
        'SELECT 1 FROM verified_visitors WHERE visitor_id = $1',
        [visitorId]
      );
      if (existing.rows.length > 0) {
        await saveOrder({
          userId: decoded.userId, visitorId, fingerprintEventId,
          status: 'placed',
          items, total, couponCode,
        });
        logFpEvent('ORDER', fpEvent, 'auto-verified — trusted device, order placed');
        return res.json({ success: true, autoVerified: true });
      }
    }

    logFpEvent('ORDER', fpEvent, 'new visitor — OTP required');
    return res.json({ needsOtp: true });
  }

  // Fingerprint not configured — allow order
  await saveOrder({
    userId: decoded.userId,
    status: 'placed',
    items, total, couponCode,
  });
  return res.json({ success: true });
});

// ─── GET /api/order/history ───────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  try {
    const result = await pool.query(
      `SELECT o.*, u.email as user_email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

export default router;
