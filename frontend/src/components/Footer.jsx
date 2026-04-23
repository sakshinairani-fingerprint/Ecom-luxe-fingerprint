import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-stone-100">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <p className="font-serif text-2xl font-semibold mb-3">LUXE</p>
            <p className="text-stone-400 text-xs leading-relaxed max-w-48">
              Premium lifestyle goods curated for those who appreciate quality and
              understated elegance.
            </p>
          </div>

          {/* Shop */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-stone-500 mb-4">Shop</p>
            <ul className="space-y-2.5">
              {['Electronics', 'Fashion', 'Home', 'Wellness', 'New Arrivals'].map(link => (
                <li key={link}>
                  <span className="text-sm text-stone-400 hover:text-stone-900 transition-colors cursor-pointer">
                    {link}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-stone-500 mb-4">Company</p>
            <ul className="space-y-2.5">
              {['About', 'Sustainability', 'Careers', 'Press', 'Contact'].map(link => (
                <li key={link}>
                  <span className="text-sm text-stone-400 hover:text-stone-900 transition-colors cursor-pointer">
                    {link}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-stone-500 mb-4">Support</p>
            <ul className="space-y-2.5">
              {['Shipping & Returns', 'Size Guide', 'FAQ', 'Track Order', 'Gift Cards'].map(link => (
                <li key={link}>
                  <span className="text-sm text-stone-400 hover:text-stone-900 transition-colors cursor-pointer">
                    {link}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-stone-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-stone-400">
            © 2024 LUXE. All rights reserved.
          </p>
          <p className="text-xs text-stone-400 flex items-center gap-1.5">
            Fraud protection by
            <span className="font-medium text-stone-600">Fingerprint.com</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
