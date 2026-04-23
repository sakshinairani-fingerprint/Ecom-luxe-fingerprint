import { useState, useEffect } from 'react';
import ProductCard from './ProductCard.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ProductGrid({ toast, activeCategory }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(r => r.json())
      .then(data => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        toast('Could not load products. Is the backend running?', 'error');
      });
  }, []);

  const filtered =
    !activeCategory || activeCategory === 'All'
      ? products
      : products.filter(p => p.category === activeCategory);

  return (
    <section id="products" className="max-w-7xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="mb-12">
        <h2 className="font-serif text-4xl font-semibold">
          {activeCategory && activeCategory !== 'All' ? activeCategory : 'Our Collection'}
        </h2>
        <p className="text-stone-400 mt-2 text-sm">
          Thoughtfully selected, impeccably crafted.
          {filtered.length > 0 && (
            <span className="ml-2 text-stone-300">({filtered.length} items)</span>
          )}
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-stone-200 mb-4" />
              <div className="h-3 bg-stone-200 mb-2 w-1/3 rounded" />
              <div className="h-4 bg-stone-200 mb-2 w-3/4 rounded" />
              <div className="h-3 bg-stone-200 w-full rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-stone-300 text-lg">No products in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-14">
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} toast={toast} />
          ))}
        </div>
      )}
    </section>
  );
}
