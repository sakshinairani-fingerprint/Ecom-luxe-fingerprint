import { useEffect, useRef } from 'react';

const FP_PUBLIC_KEY = import.meta.env.VITE_FP_PUBLIC_KEY;
const isKeyConfigured = FP_PUBLIC_KEY && FP_PUBLIC_KEY !== 'your_fingerprint_public_key_here';

// Singleton promise — initialize once across the whole app
let fpPromise = null;

function initFingerprint() {
  if (!isKeyConfigured) return null;
  if (!fpPromise) {
    // eslint-disable-next-line no-new-func
    fpPromise = new Function('key', `return import('https://fpjscdn.net/v4/' + key)`)(FP_PUBLIC_KEY)
      .then(Fingerprint => Fingerprint.start({ region: 'ap' }))
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
   * sealedResult is a base64 string when Sealed Client Results is enabled
   * in the Fingerprint dashboard; null otherwise.
   * eventId is the request/event ID for Server API fallback.
   */
  const getEventId = async () => {
    if (!isKeyConfigured) return { eventId: null, sealedResult: null };
    try {
      const fp = fpRef.current || await initFingerprint();
      if (!fp) return { eventId: null, sealedResult: null };
      const result = await fp.get();

      const eventId = result.event_id ?? result.requestId ?? null;

      // sealed_result is a BinaryOutput object when the feature is enabled
      // in the Fingerprint dashboard — call .base64() to get a string
      const sealedResult = result.sealed_result
        ? result.sealed_result.base64()
        : null;

      return { eventId, sealedResult };
    } catch (err) {
      console.warn('[Fingerprint] get() failed:', err.message);
      return { eventId: null, sealedResult: null };
    }
  };

  return { getEventId, isConfigured: isKeyConfigured };
}
