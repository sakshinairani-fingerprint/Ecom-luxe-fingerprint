import { useEffect, useRef } from 'react';

// Cloudflare-proxied URLs — requests go through sakshin-fingerprint.com,
// never directly to Fingerprint's CDN (bypasses ad blockers, first-party cookies)
const AGENT_SCRIPT_URL = 'https://sakshin-fingerprint.com/nuaIKzq7gtpoWCv7/web/v4/srQToUlzaoXoBGyRBekj';
const ENDPOINT_URL     = 'https://sakshin-fingerprint.com/nuaIKzq7gtpoWCv7/?region=ap';

// Module-level singletons — shared across all hook instances
let fpPromise        = null; // resolves to the fp client
let prefetchedResult = null; // { eventId, sealedResult } from page-load get()

function parseResult(result) {
  return {
    eventId:      result.event_id ?? result.requestId ?? null,
    sealedResult: result.sealed_result ? result.sealed_result.base64() : null,
  };
}

function initFingerprint() {
  if (!fpPromise) {
    fpPromise = new Function(`return import('${AGENT_SCRIPT_URL}')`)()
      .then(Fingerprint => Fingerprint.start({
        region: 'ap',
        endpoints: [ENDPOINT_URL],
        cache: {
          storage: 'sessionStorage',
          duration: 'optimize-cost',
        },
      }))
      .then(fp => {
        if (!fp) return null;
        // Immediately fire get() after start — store result so callers don't wait
        fp.get()
          .then(result => { prefetchedResult = parseResult(result); })
          .catch(() => {});
        return fp;
      })
      .catch(err => {
        console.warn('[Fingerprint] Init failed:', err.message);
        fpPromise = null;
        return null;
      });
  }
  return fpPromise;
}

// Called from App on page load to kick off start + get in the background
export function preloadFingerprint() {
  initFingerprint();
}

export function useFingerprint() {
  const fpRef = useRef(null);

  useEffect(() => {
    const promise = initFingerprint();
    if (promise) {
      promise.then(fp => { fpRef.current = fp; });
    }
  }, []);

  const getEventId = async (linkedId = null, tag = null) => {
    try {
      const fp = fpRef.current || await initFingerprint();
      if (!fp) return { eventId: null, sealedResult: null };

      // Auth / coupon — no metadata needed, return pre-fetched result instantly
      if (!linkedId && !tag) {
        if (prefetchedResult) return prefetchedResult;
        // Pre-fetch hasn't resolved yet (user was very fast) — wait for it
        const result = await fp.get();
        prefetchedResult = parseResult(result);
        return prefetchedResult;
      }

      // Orders — linkedId/tag create a new event with metadata, always fresh
      const options = {};
      if (linkedId) options.linkedId = linkedId;
      if (tag)      options.tag      = tag;
      const result = await fp.get(options);
      return parseResult(result);
    } catch (err) {
      console.warn('[Fingerprint] get() failed:', err.message);
      return { eventId: null, sealedResult: null };
    }
  };

  return { getEventId, isConfigured: true };
}
