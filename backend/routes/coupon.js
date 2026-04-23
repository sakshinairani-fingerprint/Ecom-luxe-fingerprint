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

function extractUserId(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    return decoded.userId ?? null;
  } catch {
    return null;
  }
}

// ─── POST /api/coupon/apply ───────────────────────────────────────────────────
// Use Case 2: Coupon Abuse Prevention
// Blocks redemption if this device has already used the coupon, is a known bot,
// or has a high suspect score.
router.post('/apply', async (req, res) => {
  const { code, fingerprintEventId, sealedResult } = req.body;
  const userId = extractUserId(req);

  if (!code) {
    return res.status(400).json({ error: 'Coupon code is required.' });
  }

  const upperCode = code.trim().toUpperCase();

  try {
    // Validate coupon
    const couponResult = await pool.query(
      'SELECT * FROM coupons WHERE code = $1 AND is_active = true',
      [upperCode]
    );
    if (couponResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired coupon code.' });
    }
    const coupon = couponResult.rows[0];

    // ── Fingerprint fraud checks ──────────────────────────────────────────────
    // Fingerprint is required when the SDK is configured — no event ID = block.
    if (fpClient && !fingerprintEventId && !sealedResult) {
      return res.status(403).json({
        error: 'Coupon verification failed. Please try again.',
        reason: 'missing_fingerprint',
      });
    }

    let visitorId = null;

    if (fingerprintEventId || sealedResult) {
      const fpEvent = await getFpEvent(fingerprintEventId, sealedResult);

      if (!fpEvent) {
        return res.status(403).json({
          error: 'Coupon verification failed. Please try again.',
          reason: 'fingerprint_lookup_failed',
        });
      }

      // 1. Block bots
      if (fpEvent.bot === 'bad') {
        logFpEvent('COUPON', fpEvent, `bot detected — coupon ${upperCode} blocked`, true);
        return res.status(403).json({
          error: 'Coupon blocked: automated bot activity detected.',
          reason: 'bot_detected',
        });
      }

      // 2. Block high suspect scores
      const suspectScore = fpEvent.suspect_score;
      if (typeof suspectScore === 'number' && suspectScore >= 20) {
        logFpEvent('COUPON', fpEvent, `suspect score ${suspectScore} — coupon ${upperCode} blocked`, true);
        return res.status(403).json({
          error: 'Coupon blocked: suspicious activity detected.',
          reason: 'high_suspect_score',
        });
      }

      // 3. One redemption per device (visitor ID)
      visitorId = fpEvent.identification?.visitor_id;
      if (!visitorId) {
        logFpError('COUPON', 'no visitor_id in event — cannot identify device');
        return res.status(403).json({
          error: 'Coupon verification failed: device could not be identified.',
          reason: 'no_visitor_id',
        });
      }

      const redeemed = await pool.query(
        `SELECT 1 FROM coupon_redemptions
         WHERE coupon_code = $1 AND visitor_id = $2
         LIMIT 1`,
        [upperCode, visitorId]
      );
      if (redeemed.rows.length > 0) {
        logFpEvent('COUPON', fpEvent, `coupon ${upperCode} already redeemed on this device`, true);
        return res.status(403).json({
          error: 'This coupon has already been redeemed from this device.',
          reason: 'already_redeemed',
        });
      }

      logFpEvent('COUPON', fpEvent, `coupon ${upperCode} applied`);
    }

    // Record redemption
    await pool.query(
      `INSERT INTO coupon_redemptions (coupon_code, visitor_id, user_id)
       VALUES ($1, $2, $3)`,
      [upperCode, visitorId ?? 'unknown', userId]
    );

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountPercent: coupon.discount_percent,
        description: coupon.description,
      },
    });
  } catch (err) {
    console.error('[coupon/apply]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/coupon/codes ────────────────────────────────────────────────────
// Demo endpoint: list active coupon codes so the UI can show hints.
router.get('/codes', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT code, discount_percent, description FROM coupons WHERE is_active = true ORDER BY discount_percent'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[coupon/codes]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
