import { useEffect, useRef } from 'react';
import * as Fingerprint from '@fingerprint/agent';

// Cloudflare-proxied endpoint — requests go through sakshin-fingerprint.com,
// never directly to Fingerprint's CDN (bypasses ad blockers, first-party cookies)
const ENDPOINT_URL = 'https://sakshin-fingerprint.com/nuaIKzq7gtpoWCv7/?region=ap';

// Singleton promise — initialize once across the whole app
let fpPromise = null;

function initFingerprint() {
  if (!fpPromise) {
    fpPromise = Promise.resolve(
      Fingerprint.start({
        apiKey: 'srQToUlzaoXoBGyRBekj',
        region: 'ap',
        endpoints: [
          ENDPOINT_URL,
          Fingerprint.defaultEndpoint, // fallback to Fingerprint's CDN if proxy is down
        ],
        // Cache visitor ID in sessionStorage to reduce API calls
        cache: {
          storage: 'sessionStorage',
          duration: 'optimize-cost',
        },
      })
    ).catch(err => {
      console.warn('[Fingerprint] Init failed:', err.message);
      fpPromise = null;
      return null;
    });
  }
  return fpPromise;
}

export function useFingerprint() {
  const fpRef = useRef(null);

  useEffect(() => {
    const promise = initFingerprint();
    if (promise) {
      promise.then(fp => { fpRef.current = fp; });
    }
  }, []);

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
      const fp = fpRef.current || await initFingerprint();
      if (!fp) return { eventId: null, sealedResult: null };

      const options = {};
      if (linkedId) options.linkedId = linkedId;
      if (tag)      options.tag      = tag;

      const result = await fp.get(options);

      const eventId = result.event_id ?? result.requestId ?? null;
      const sealedResult = result.sealed_result
        ? result.sealed_result.base64()
        : null;

      return { eventId, sealedResult };
    } catch (err) {
      console.warn('[Fingerprint] get() failed:', err.message);
      return { eventId: null, sealedResult: null };
    }
  };

  return { getEventId, isConfigured: true };
}
