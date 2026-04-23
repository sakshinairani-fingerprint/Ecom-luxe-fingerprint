import express from 'express';
import { FingerprintServerApiClient, Region, isValidWebhookSignature } from '@fingerprint/node-sdk';
import pool from '../db/index.js';

const router = express.Router();

const FP_KEY = process.env.FP_SECRET_API_KEY;
const fpClient =
  FP_KEY && FP_KEY !== 'your_fingerprint_secret_key_here'
    ? new FingerprintServerApiClient({ apiKey: FP_KEY, region: Region.AP })
    : null;

// ─── POST /api/webhook/fingerprint ───────────────────────────────────────────
// Fingerprint sends a webhook for every identification event.
// We verify the signature, then call the Server API to get the full enriched
// event (all Smart Signals) and store it in the DB.
//
// NOTE: This route must receive the RAW body (Buffer) for signature verification.
// It is mounted BEFORE express.json() in server.js using express.raw() middleware.
router.post('/fingerprint', express.raw({ type: 'application/json' }), async (req, res) => {
  // ── 1. Acknowledge immediately (Fingerprint requires 2xx within 3 seconds) ──
  res.status(200).send('OK');

  try {
    // ── 2. Verify HMAC-SHA256 signature ──────────────────────────────────────
    const signature = req.headers['fpjs-event-signature'];
    const webhookSecret = process.env.FP_WEBHOOK_SECRET;

    if (webhookSecret && webhookSecret !== 'your_webhook_secret_here') {
      if (!signature) {
        console.warn('[webhook] Missing FPJS-Event-Signature header — skipping event.');
        return;
      }
      const valid = await isValidWebhookSignature({
        header: signature,
        data: req.body,        // raw Buffer
        secret: webhookSecret,
      });
      if (!valid) {
        console.warn('[webhook] Invalid signature — rejecting event.');
        return;
      }
    } else {
      console.warn('[webhook] FP_WEBHOOK_SECRET not configured — skipping signature check.');
    }

    // ── 3. Parse the webhook payload ─────────────────────────────────────────
    const payload = JSON.parse(req.body.toString());
    console.log('[webhook] Received event:', JSON.stringify(payload, null, 2));

    const eventId = payload.event_id ?? payload.requestId;
    const visitorId = payload.identification?.visitor_id
      ?? payload.products?.identification?.data?.visitorId;

    if (!eventId) {
      console.warn('[webhook] No event_id in payload — skipping.');
      return;
    }

    // ── 4. Call Server API to get the full enriched event ────────────────────
    let enrichedEvent = null;
    if (fpClient) {
      try {
        enrichedEvent = await fpClient.getEvent(eventId);
        console.log('[webhook] Enriched event from Server API:', JSON.stringify(enrichedEvent, null, 2));
      } catch (err) {
        console.error('[webhook] Server API getEvent failed:', err.message);
      }
    }

    // Use enriched data if available, fall back to webhook payload
    const event = enrichedEvent ?? payload;

    // ── 5. Extract signals ────────────────────────────────────────────────────
    const resolvedVisitorId  = event.identification?.visitor_id ?? visitorId ?? null;
    const bot                = event.bot ?? null;
    const suspectScore       = event.suspect_score ?? null;
    const incognito          = event.incognito ?? null;
    const vpn                = event.vpn ?? null;
    const proxy              = event.proxy ?? null;
    const ipAddress          = event.ip_address ?? null;
    const browser            = event.browser_details?.browser_name ?? null;
    const os                 = event.browser_details?.os_name ?? null;

    // ── 6. Upsert into fingerprint_events ────────────────────────────────────
    // If this event_id was already stored (e.g. from login/signup), enrich it.
    // Otherwise insert a new standalone webhook event.
    await pool.query(
      `INSERT INTO fingerprint_events
         (visitor_id, event_type, event_id,
          bot, suspect_score, incognito, vpn, proxy,
          ip_address, browser, os, raw_payload)
       VALUES ($1, 'webhook', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (event_id)
       DO UPDATE SET
         bot           = EXCLUDED.bot,
         suspect_score = EXCLUDED.suspect_score,
         incognito     = EXCLUDED.incognito,
         vpn           = EXCLUDED.vpn,
         proxy         = EXCLUDED.proxy,
         ip_address    = EXCLUDED.ip_address,
         browser       = EXCLUDED.browser,
         os            = EXCLUDED.os,
         raw_payload   = EXCLUDED.raw_payload`,
      [
        resolvedVisitorId,
        eventId,
        bot,
        suspectScore,
        incognito,
        vpn,
        proxy,
        ipAddress,
        browser,
        os,
        JSON.stringify(event),
      ]
    );

    console.log(`[webhook] Stored event ${eventId} for visitor ${resolvedVisitorId}`);
  } catch (err) {
    console.error('[webhook] Processing error:', err);
  }
});

export default router;
