import { useEffect, useRef } from 'react';

// Cloudflare-proxied URLs — requests go through sakshin-fingerprint.com,
// never directly to Fingerprint's CDN (bypasses ad blockers, first-party cookies)
const AGENT_SCRIPT_URL = 'https://sakshin-fingerprint.com/nuaIKzq7gtpoWCv7/web/v4/srQToUlzaoXoBGyRBekj';
const ENDPOINT_URL     = 'https://sakshin-fingerprint.com/nuaIKzq7gtpoWCv7/?region=ap';

// Singleton promise — initialize once across the whole app
let fpPromise = null;

function initFingerprint() {
  if (!fpPromise) {
    // eslint-disable-next-line no-new-func
    fpPromise = new Function(`return import('${AGENT_SCRIPT_URL}')`)()
      .then(Fingerprint => Fingerprint.start({
        region: 'ap',
        endpoints: [ENDPOINT_URL],
      }))
      .catch(err => {
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
   * Returns { eventId, sealedResult } from the JS agent.
   * sealedResult is a base64 string when Sealed Client Results is enabled.
   */
  const getEventId = async () => {
    try {
      const fp = fpRef.current || await initFingerprint();
      if (!fp) return { eventId: null, sealedResult: null };
      const result = await fp.get();

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
