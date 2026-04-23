import React from 'react';

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'New Account Fraud',
    description:
      'Device fingerprinting ensures each device can only create one account, blocking multi-account abuse even across browsers and incognito mode.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
      </svg>
    ),
    title: 'Coupon Abuse Prevention',
    description:
      'Single-use discount codes are tied to the device fingerprint. Attempting to redeem the same code twice — even from a new browser — is automatically blocked.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.397-1.345 2.01L12 16.5l-7.857 2.21c-1.377.388-2.345-1.01-1.345-2.01L4.2 15.3" />
      </svg>
    ),
    title: 'Bot Detection',
    description:
      'Real-time bot scoring blocks automated scripts and headless browsers from creating fake accounts, abusing coupons, or scraping inventory.',
  },
];

export default function SecuritySection() {
  return (
    <section className="bg-stone-900 text-white py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-[10px] tracking-[0.2em] uppercase text-amber-400 mb-3">
            Fraud Protection
          </p>
          <h2 className="font-serif text-3xl font-semibold mb-3">
            Secured by Fingerprint.com
          </h2>
          <p className="text-stone-400 text-sm max-w-lg mx-auto">
            Every interaction is protected by device intelligence — invisible to honest
            customers, impossible for fraudsters to bypass.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((f, i) => (
            <div key={i} className="border border-stone-700 p-8 hover:border-stone-500 transition-colors">
              <div className="text-amber-400 mb-5">{f.icon}</div>
              <h3 className="font-medium text-white mb-3">{f.title}</h3>
              <p className="text-stone-400 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
