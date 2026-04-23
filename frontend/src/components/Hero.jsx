import React from 'react';

export default function Hero({ onShopNow }) {
  return (
    <section className="relative bg-stone-900 text-white overflow-hidden" style={{ minHeight: '88vh' }}>
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop&q=80"
          alt="Store interior"
          className="w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-900/80 via-stone-900/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-6 flex flex-col justify-center h-full" style={{ minHeight: '88vh' }}>
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-amber-400 mb-5">
            New Collection — Spring 2024
          </p>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-semibold leading-[1.05] mb-7">
            Curated for<br />the Discerning.
          </h1>

          <p className="text-stone-300 text-lg leading-relaxed max-w-lg mb-10">
            A handpicked selection of premium products — where quality meets
            quiet elegance. Free shipping on all orders.
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={onShopNow}
              className="bg-white text-stone-900 px-8 py-4 text-sm font-medium tracking-wide
                         hover:bg-stone-100 transition-colors"
            >
              Shop the Collection
            </button>
            <button
              onClick={onShopNow}
              className="text-white/70 text-sm font-medium hover:text-white transition-colors
                         flex items-center gap-2 group"
            >
              View lookbook
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
        <div className="w-px h-8 bg-white/20 animate-pulse" />
        <span className="text-[10px] tracking-widest uppercase">Scroll</span>
      </div>
    </section>
  );
}
