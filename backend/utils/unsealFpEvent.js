import { unsealEventsResponse, DecryptionAlgorithm } from '@fingerprint/node-sdk';

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  magenta:'\x1b[35m',
  white:  '\x1b[37m',
};

const SEALED_KEY = process.env.FP_SEALED_KEY;

/**
 * Normalize the decrypted event into the flat shape used across all routes.
 * unsealEventsResponse returns the raw /v4/events structure (nested products),
 * while getEvent() in v7 returns a flat normalized shape.
 * This function handles both so routes work regardless of which path was used.
 */
function normalize(event) {
  if (!event) return null;

  // Already flat (came via getEvent path or SDK normalized it)
  if (event.identification !== undefined && typeof event.identification !== 'object'?.products) {
    return event;
  }

  // Raw /v4/events nested structure — flatten it
  const p = event.products ?? {};

  const visitorId   = p.identification?.data?.visitorId ?? null;
  const requestId   = p.identification?.data?.requestId ?? null;
  const incognito   = p.identification?.data?.incognito ?? null;
  const botResult   = p.botd?.data?.bot?.result;           // 'bad' | 'notDetected'
  const bot         = botResult === 'bad' ? 'bad'
                    : botResult === 'notDetected' ? 'good'
                    : botResult ?? null;
  const suspectScore = p.suspect_score?.data?.result ?? null;
  const vpn         = p.vpn?.data?.result ?? null;
  const proxy       = p.proxy?.data?.result ?? null;
  const ipAddress   = p.identification?.data?.ip
                    ?? p.ip_info?.data?.v4?.address
                    ?? null;
  const browserName = p.identification?.data?.browserDetails?.browserName ?? null;
  const osName      = p.identification?.data?.browserDetails?.os ?? null;

  return {
    // Flat fields used by all routes
    bot,
    suspect_score:    suspectScore,
    incognito,
    vpn,
    proxy,
    ip_address:       ipAddress,
    identification:   visitorId ? { visitor_id: visitorId, request_id: requestId } : null,
    browser_details:  browserName ? { browser_name: browserName, os_name: osName } : null,
    // Keep original for raw_payload storage
    _raw: event,
  };
}

/**
 * Decrypt a sealed result from the browser JS agent, log both the
 * encrypted (base64) and fully decrypted payload to the terminal,
 * then return a normalized event object ready for fraud checks.
 *
 * @param {string} sealedResultBase64 — base64 string from result.sealed_result.base64()
 * @returns {object|null} normalized event, or null if decryption fails
 */
export async function unsealFpEvent(sealedResultBase64) {
  if (!SEALED_KEY) {
    console.warn('[Sealed] FP_SEALED_KEY not set — cannot decrypt');
    return null;
  }
  if (!sealedResultBase64) return null;

  const width = 70;

  // ── Print encrypted blob ────────────────────────────────────────────────
  const preview = sealedResultBase64.length > 80
    ? sealedResultBase64.slice(0, 60) + '…' + sealedResultBase64.slice(-20)
    : sealedResultBase64;

  console.log(`\n${c.magenta}${'━'.repeat(width)}${c.reset}`);
  console.log(`${c.magenta}${c.bold}  🔐 SEALED RESULT  (encrypted — as received from browser)${c.reset}`);
  console.log(`${c.magenta}${'━'.repeat(width)}${c.reset}`);
  console.log(`${c.dim}  Algorithm : AES-256-GCM${c.reset}`);
  console.log(`${c.dim}  Length    : ${sealedResultBase64.length} chars (base64)${c.reset}`);
  console.log(`${c.dim}  Data      : ${preview}${c.reset}`);

  // ── Decrypt ─────────────────────────────────────────────────────────────
  let raw;
  try {
    raw = await unsealEventsResponse(
      Buffer.from(sealedResultBase64, 'base64'),
      [{
        key:       Buffer.from(SEALED_KEY, 'base64'),
        algorithm: DecryptionAlgorithm.Aes256Gcm,
      }]
    );
  } catch (err) {
    console.error(`${c.magenta}  ✗ Decryption failed: ${err.message}${c.reset}`);
    console.log(`${c.magenta}${'━'.repeat(width)}${c.reset}\n`);
    return null;
  }

  // ── Print decrypted payload ─────────────────────────────────────────────
  console.log(`\n${c.green}${'━'.repeat(width)}${c.reset}`);
  console.log(`${c.green}${c.bold}  🔓 DECRYPTED PAYLOAD  (AES-256-GCM decrypted)${c.reset}`);
  console.log(`${c.green}${'━'.repeat(width)}${c.reset}`);
  console.log(JSON.stringify(raw, null, 2)
    .split('\n')
    .map(line => `  ${line}`)
    .join('\n'));
  console.log(`${c.green}${'━'.repeat(width)}${c.reset}\n`);

  return normalize(raw);
}

export const isSealedConfigured = !!SEALED_KEY;
