import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';

export default function ProductCard({ product, toast }) {
  const { addItem } = useCart();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    setAdding(true);
    addItem(product);
    toast(`${product.name} added to cart`, 'success');
    setTimeout(() => setAdding(false), 600);
  };

  const handleBuyNow = () => {
    addItem(product);
  };

  return (
    <div className="group cursor-default">
      {/* Image */}
      <div className="relative aspect-square bg-stone-100 overflow-hidden mb-4">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-stone-200 animate-pulse" />
        )}
        <img
          src={product.image_url}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-700
                      group-hover:scale-[1.04] ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Badge */}
        {product.badge && (
          <span className="absolute top-3 left-3 bg-stone-900 text-white text-[10px] px-2.5 py-1 font-medium tracking-widest uppercase">
            {product.badge}
          </span>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/8 transition-colors duration-300" />

        {/* Quick buy button — slides up on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={handleBuyNow}
            className="w-full bg-white/95 backdrop-blur-sm text-stone-900 text-xs font-medium
                       py-3 hover:bg-stone-900 hover:text-white transition-colors tracking-wide"
          >
            Quick Add
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-stone-400 uppercase tracking-[0.15em]">{product.category}</p>

        <h3 className="text-sm font-medium text-stone-900 leading-snug line-clamp-1">
          {product.name}
        </h3>

        <p className="text-xs text-stone-400 leading-relaxed line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-center justify-between pt-1.5">
          <span className="text-sm font-semibold text-stone-900">
            ${parseFloat(product.price).toFixed(2)}
          </span>
          <button
            onClick={handleAddToCart}
            className={`text-xs transition-colors border-b pb-0.5 ${
              adding
                ? 'text-stone-900 border-stone-900'
                : 'text-stone-400 border-stone-200 hover:text-stone-900 hover:border-stone-900'
            }`}
          >
            {adding ? 'Added ✓' : 'Add to cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
