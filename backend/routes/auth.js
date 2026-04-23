import express from 'express';
import bcrypt from 'bcryptjs';
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

// Use sealed result when available (no Server API call needed),
// otherwise fall back to Server API getEvent.
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

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { email, name, password, fingerprintEventId, sealedResult } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name and password are required.' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    let visitorId = null;
    let fpEvent = null;

    if (fingerprintEventId || sealedResult) {
      fpEvent = await getFpEvent(fingerprintEventId, sealedResult);

      if (fpEvent) {
        // 1. Block bots
        if (fpEvent.bot === 'bad') {
          logFpEvent('SIGNUP', fpEvent, 'bot detected', true);
          return res.status(403).json({
            error: 'Signup blocked: automated bot activity detected.',
            reason: 'bot_detected',
          });
        }

        // 2. Block high suspect scores
        const suspectScore = fpEvent.suspect_score;
        if (typeof suspectScore === 'number' && suspectScore >= 20) {
          logFpEvent('SIGNUP', fpEvent, `suspect score ${suspectScore}`, true);
          return res.status(403).json({
            error: 'Signup blocked: suspicious activity detected on this device.',
            reason: 'high_suspect_score',
          });
        }

        // 3. Max 2 accounts per device
        const MAX_ACCOUNTS_PER_DEVICE = 3;
        visitorId = fpEvent.identification?.visitor_id;
        if (visitorId) {
          const deviceAccounts = await pool.query(
            'SELECT COUNT(*) FROM users WHERE visitor_id = $1',
            [visitorId]
          );
          if (parseInt(deviceAccounts.rows[0].count) >= MAX_ACCOUNTS_PER_DEVICE) {
            logFpEvent('SIGNUP', fpEvent, `max ${MAX_ACCOUNTS_PER_DEVICE} accounts per device`, true);
            return res.status(403).json({
              error: `Signup blocked: maximum ${MAX_ACCOUNTS_PER_DEVICE} accounts allowed per device.`,
              reason: 'duplicate_device',
            });
          }
        }
      } else {
        logFpError('SIGNUP', 'getEvent returned null — event ID may be invalid or expired');
      }
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash, visitor_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name`,
      [email, name, passwordHash, visitorId]
    );
    const user = result.rows[0];

    // Store fingerprint event
    if (fpEvent) {
      logFpEvent('SIGNUP', fpEvent, `account created for ${email}`);
      await pool.query(
        `INSERT INTO fingerprint_events
           (user_id, visitor_id, event_type, event_id,
            bot, suspect_score, incognito, vpn, proxy, ip_address, browser, os, raw_payload)
         VALUES ($1,$2,'signup',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          user.id,
          visitorId,
          fingerprintEventId,
          fpEvent.bot ?? null,
          fpEvent.suspect_score ?? null,
          fpEvent.incognito ?? null,
          fpEvent.vpn ?? null,
          fpEvent.proxy ?? null,
          fpEvent.ip_address ?? null,
          fpEvent.browser_details?.browser_name ?? null,
          fpEvent.browser_details?.os_name ?? null,
          JSON.stringify(fpEvent),
        ]
      );
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ success: true, token, user });
  } catch (err) {
    console.error('[signup]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password, fingerprintEventId, sealedResult } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let isIncognito = false;

    if (fingerprintEventId || sealedResult) {
      const fpEvent = await getFpEvent(fingerprintEventId, sealedResult);

      if (fpEvent) {
        const visitorId = fpEvent.identification?.visitor_id;
        if (visitorId && visitorId !== user.visitor_id) {
          await pool.query('UPDATE users SET visitor_id = $1 WHERE id = $2', [visitorId, user.id]);
        }
        isIncognito = fpEvent.incognito === true;

        logFpEvent('LOGIN', fpEvent, `${email}${isIncognito ? ' · incognito session' : ''}`, false);

        await pool.query(
          `INSERT INTO fingerprint_events
             (user_id, visitor_id, event_type, event_id,
              bot, suspect_score, incognito, vpn, proxy, ip_address, browser, os, raw_payload)
           VALUES ($1,$2,'login',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            user.id,
            visitorId ?? null,
            fingerprintEventId,
            fpEvent.bot ?? null,
            fpEvent.suspect_score ?? null,
            isIncognito,
            fpEvent.vpn ?? null,
            fpEvent.proxy ?? null,
            fpEvent.ip_address ?? null,
            fpEvent.browser_details?.browser_name ?? null,
            fpEvent.browser_details?.os_name ?? null,
            JSON.stringify(fpEvent),
          ]
        );
      } else {
        logFpError('LOGIN', 'getEvent returned null — event ID may be invalid or expired');
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name },
      flags: { incognito: isIncognito },
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
