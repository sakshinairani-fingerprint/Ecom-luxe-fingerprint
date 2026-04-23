import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const CATEGORIES = ['Electronics', 'Fashion', 'Home', 'Wellness'];

export default function Navbar({ onLogin, onSignup, onCategoryChange, activeCategory }) {
  const { totalItems, setIsOpen } = useCart();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
        scrolled ? 'shadow-sm' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => onCategoryChange('All')}
            className="font-serif text-2xl font-semibold tracking-tight select-none"
          >
            LUXE
          </button>

          {/* Category nav — desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  onCategoryChange(cat);
                  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`text-sm transition-colors ${
                  activeCategory === cat
                    ? 'text-stone-900 font-medium'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-stone-500 hidden sm:block">
                  Hi, {user.name.split(' ')[0]}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-stone-400 hover:text-stone-900 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={onLogin}
                  className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
                >
                  Sign in
                </button>
                <button onClick={onSignup} className="btn-primary text-xs py-2 px-4">
                  Join
                </button>
              </div>
            )}

            {/* Cart */}
            <button
              onClick={() => setIsOpen(true)}
              className="relative p-2 hover:bg-stone-100 transition-colors rounded"
              aria-label="Open cart"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.962-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-stone-900 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium leading-none">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile category strip */}
      <div className="md:hidden border-t border-stone-100 px-6 py-2 flex gap-4 overflow-x-auto scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => {
              onCategoryChange(cat);
              document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`text-xs whitespace-nowrap pb-1 transition-colors ${
              activeCategory === cat
                ? 'text-stone-900 font-medium border-b border-stone-900'
                : 'text-stone-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </header>
  );
}
