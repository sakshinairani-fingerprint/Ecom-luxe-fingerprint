import { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFingerprint } from '../hooks/useFingerprint.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function CheckoutModal({ onClose, toast }) {
  const { items, subtotal, clearCart } = useCart();
  const { token, user, isIncognito } = useAuth();
  const { getEventId, isConfigured } = useFingerprint();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [availableCodes, setAvailableCodes] = useState([]);

  // OTP flow
  const [orderLoading, setOrderLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);      // showing OTP input
  const [otpCode, setOtpCode] = useState('');
  const [autoVerified, setAutoVerified] = useState(false);
  const eventIdRef = useRef(null);                     // reuse event ID across phases
  const sealedResultRef = useRef(null);                // reuse sealed result across phases
  const otpInputRef = useRef(null);

  const discount = appliedCoupon ? subtotal * (appliedCoupon.discountPercent / 100) : 0;
  const total = subtotal - discount;

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !orderPlaced) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, orderPlaced]);

  // Focus OTP input when step appears
  useEffect(() => {
    if (otpStep) otpInputRef.current?.focus();
  }, [otpStep]);

  // Fetch available coupon codes for demo hint
  useEffect(() => {
    fetch(`${API_URL}/api/coupon/codes`)
      .then(r => r.json())
      .then(data => Array.isArray(data) && setAvailableCodes(data))
      .catch(() => {});
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { eventId: fingerprintEventId, sealedResult: couponSealedResult } = await getEventId();
      const res = await fetch(`${API_URL}/api/coupon/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: couponCode.trim(), fingerprintEventId, sealedResult: couponSealedResult }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || 'Invalid coupon code.', 'error'); return; }
      setAppliedCoupon(data.coupon);
      toast(`${data.coupon.discountPercent}% discount applied!`, 'success');
    } catch {
      toast('Could not apply coupon. Please try again.', 'error');
    } finally {
      setCouponLoading(false);
    }
  };

  // Phase 1 — capture fingerprint, run fraud checks, check if visitor is trusted
  const handlePlaceOrder = async () => {
    setOrderLoading(true);
    try {
      const linkedId = items.map(i => i.name).join(', ');
      const tag = {
        action:    'place_order',
        items:     items.map(i => ({ name: i.name, qty: i.quantity, price: i.price })),
        total:     total.toFixed(2),
        coupon:    appliedCoupon?.code ?? null,
        userEmail: user?.email ?? null,
      };
      const { eventId: fingerprintEventId, sealedResult } = await getEventId(linkedId, tag);
      eventIdRef.current = fingerprintEventId;          // save for OTP phase
      sealedResultRef.current = sealedResult;           // save for OTP phase

      const res = await fetch(`${API_URL}/api/order/place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fingerprintEventId,
          sealedResult,
          items: items.map(i => ({ id: i.id, name: i.name, qty: i.quantity, price: i.price })),
          total,
          couponCode: appliedCoupon?.code ?? null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast(data.error || 'Order could not be placed. Please try again.', 'error');
        return;
      }

      if (data.needsOtp) {
        // First-time visitor — show OTP input
        setOtpStep(true);
        return;
      }

      if (data.autoVerified) {
        // Returning visitor — show brief banner then complete
        setAutoVerified(true);
        setTimeout(() => completeOrder(), 1200);
        return;
      }

      completeOrder();
    } catch {
      toast('Network error. Please check your connection.', 'error');
    } finally {
      setOrderLoading(false);
    }
  };

  // Phase 2 — submit OTP, store trusted visitor, complete order
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast('Please enter the 6-digit OTP.', 'error');
      return;
    }
    setOrderLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/order/place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fingerprintEventId: eventIdRef.current,
          sealedResult: sealedResultRef.current,
          otpCode,
          items: items.map(i => ({ id: i.id, name: i.name, qty: i.quantity, price: i.price })),
          total,
          couponCode: appliedCoupon?.code ?? null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast(data.error || 'Verification failed. Please try again.', 'error');
        return;
      }

      completeOrder();
    } catch {
      toast('Network error. Please check your connection.', 'error');
    } finally {
      setOrderLoading(false);
    }
  };

  const completeOrder = () => {
    setOrderPlaced(true);
    clearCart();
    setTimeout(() => onClose(), 2500);
  };

  // ── Order success screen ──────────────────────────────────────────────────
  if (orderPlaced) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" />
        <div className="relative bg-white w-full max-w-sm shadow-2xl p-12 text-center animate-slide-in">
          <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-serif text-3xl font-semibold mb-3">Order Placed!</h2>
          <p className="text-stone-400 text-sm leading-relaxed">
            Thank you for shopping at LUXE.<br />Your order is being prepared.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-in">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white border-b border-stone-100 px-8 py-5 flex items-center justify-between z-10">
          <h2 className="font-serif text-2xl font-semibold">Checkout</h2>
          <button onClick={onClose} className="p-2 text-stone-300 hover:text-stone-900 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8">
          <div className="grid md:grid-cols-2 gap-10">
            {/* Order items */}
            <div>
              <h3 className="text-[10px] font-medium uppercase tracking-widest text-stone-400 mb-5">
                Order Summary
              </h3>
              <div className="space-y-5">
                {items.map(item => (
                  <div key={item.id} className="flex gap-3.5 items-start">
                    <div className="w-14 h-14 bg-stone-100 flex-shrink-0 overflow-hidden">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug text-stone-900 line-clamp-2">{item.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Qty {item.quantity} × ${parseFloat(item.price).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-stone-900 whitespace-nowrap">
                      ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: coupon + payment */}
            <div className="space-y-7">
              {/* Coupon section */}
              <div>
                <h3 className="text-[10px] font-medium uppercase tracking-widest text-stone-400 mb-3">
                  Coupon Code
                  {isConfigured && (
                    <span className="ml-2 text-stone-300 normal-case tracking-normal">· protected</span>
                  )}
                </h3>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{appliedCoupon.code}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{appliedCoupon.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-600 font-semibold text-sm">−{appliedCoupon.discountPercent}%</span>
                      <button
                        onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                        className="text-stone-300 hover:text-red-500 transition-colors text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      className="input-field flex-1 uppercase tracking-widest text-xs"
                      placeholder="ENTER CODE"
                      onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="btn-outline text-xs px-4 whitespace-nowrap"
                    >
                      {couponLoading ? '…' : 'Apply'}
                    </button>
                  </div>
                )}

                {availableCodes.length > 0 && !appliedCoupon && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableCodes.map(c => (
                      <button
                        key={c.code}
                        onClick={() => setCouponCode(c.code)}
                        className="text-[10px] bg-stone-100 text-stone-500 px-2 py-1 hover:bg-stone-200 transition-colors tracking-wider"
                      >
                        {c.code} ({c.discount_percent}% off)
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Price summary */}
              <div className="border-t border-stone-100 pt-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({appliedCoupon.discountPercent}%)</span>
                    <span>−${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Shipping</span>
                  <span className="text-stone-400">Free</span>
                </div>
                <div className="flex justify-between font-semibold pt-3 border-t border-stone-100">
                  <span className="text-base">Total</span>
                  <span className="text-lg">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* ── Action area ── */}
              {isIncognito ? (
                <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center">
                  <p className="font-medium">Incognito mode detected</p>
                  <p className="text-xs mt-1 text-red-500">
                    Orders cannot be placed in private browsing. Please switch to a normal window.
                  </p>
                </div>
              ) : autoVerified ? (
                /* Auto-verified banner — flashes briefly before order completes */
                <div className="border border-green-200 bg-green-50 px-4 py-4 text-center animate-fade-in">
                  <div className="flex items-center justify-center gap-2 text-green-700 font-medium text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Trusted device — no verification needed
                  </div>
                  <p className="text-xs text-green-600 mt-1">Placing your order…</p>
                </div>
              ) : otpStep ? (
                /* OTP input */
                <div className="space-y-4 animate-fade-in">
                  <div className="border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                    <p className="font-medium text-stone-900 mb-0.5">Verify your identity</p>
                    <p className="text-xs text-stone-400">
                      OTP sent to <span className="font-medium text-stone-600">{user?.email}</span>
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-stone-500 block mb-1.5 tracking-widest uppercase">
                      Enter 6-digit OTP
                    </label>
                    <input
                      ref={otpInputRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={e => e.key === 'Enter' && otpCode.length === 6 && handleVerifyOtp()}
                      className="input-field text-center tracking-[0.5em] text-lg font-semibold"
                      placeholder="______"
                    />
                  </div>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={orderLoading || otpCode.length !== 6}
                    className="btn-primary w-full py-4 text-sm disabled:opacity-60"
                  >
                    {orderLoading ? 'Verifying…' : 'Verify & Place Order'}
                  </button>

                  <button
                    onClick={() => { setOtpStep(false); setOtpCode(''); }}
                    className="w-full text-xs text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    Go back
                  </button>
                </div>
              ) : (
                /* Default Place Order button */
                <button
                  onClick={handlePlaceOrder}
                  disabled={orderLoading}
                  className="btn-primary w-full py-4 text-sm disabled:opacity-60"
                >
                  {orderLoading ? 'Verifying…' : `Place Order — $${total.toFixed(2)}`}
                </button>
              )}

              <p className="text-[11px] text-stone-400 text-center flex items-center justify-center gap-1.5">
                <span>🔒</span>
                Secured with device verification via Fingerprint.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
