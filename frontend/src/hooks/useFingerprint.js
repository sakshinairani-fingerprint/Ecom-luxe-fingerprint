import { useRef } from 'react';
import { start } from '@fingerprint/agent';

// Cloudflare-proxied base URL — npm package appends /web/v4/{apiKey} automatically.
// Full resolved script URL: sakshin-fingerprint.com/nuaIKzq7gtpoWCv7/web/v4/srQToUlzaoXoBGyRBekj
const PROXY_BASE_URL = 'https://sakshin-fingerprint.com/nuaIKzq7gtpoWCv7/';

// start() is synchronous in v4 — returns a lazy fp object immediately.
// Actual script loading happens on first fp.get() call.
let fpClient = null;

function getClient() {
  if (!fpClient) {
    try {
      fpClient = start({
        apiKey: 'srQToUlzaoXoBGyRBekj',
        region: 'ap',
        endpoints: [PROXY_BASE_URL],
        cache: {
          storage: 'sessionStorage',
          duration: 'optimize-cost',
        },
      });
    } catch (err) {
      console.warn('[Fingerprint] start() failed:', err.message);
    }
  }
  return fpClient;
}

export function useFingerprint() {
  // Keep a ref so the hook is stable across renders
  const clientRef = useRef(null);
  if (!clientRef.current) {
    clientRef.current = getClient();
  }

  /**
   * Capture a Fingerprint event.
   *
   * @param {string}  linkedId - searchable ID to link event to a business entity
   *                             e.g. order ID, user email
   * @param {object}  tag      - arbitrary metadata stored with the event
   *                             e.g. { action, items, total }
   *
   * Returns { eventId, sealedResult }
   * sealedResult is a base64 string when Sealed Client Results is enabled.
   */
  const getEventId = async (linkedId = null, tag = null) => {
    try {
      const fp = clientRef.current || getClient();
      if (!fp) return { eventId: null, sealedResult: null };

      const options = {};
      if (linkedId) options.linkedId = linkedId;
      if (tag)      options.tag      = tag;

      const result = await fp.get(options);

      // v4 npm package uses camelCase field names
      const eventId      = result.requestId ?? null;
      const sealedResult = result.sealedResult ?? null;

      return { eventId, sealedResult };
    } catch (err) {
      console.warn('[Fingerprint] get() failed:', err.message);
      return { eventId: null, sealedResult: null };
    }
  };

  return { getEventId, isConfigured: true };
}
