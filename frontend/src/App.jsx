import { useState, useCallback, useEffect } from 'react';
import { preloadFingerprint } from './hooks/useFingerprint.js';
import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import ProductGrid from './components/ProductGrid.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import AuthModal from './components/AuthModal.jsx';
import CheckoutModal from './components/CheckoutModal.jsx';
import SecuritySection from './components/SecuritySection.jsx';
import Footer from './components/Footer.jsx';
import { Toast } from './components/Toast.jsx';

function AppContent() {
  const { isIncognito } = useAuth();

  // Kick off Fingerprint start + get on page load so the result is ready
  // before the user interacts with auth or checkout
  useEffect(() => { preloadFingerprint(); }, []);
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const openSignup = useCallback(() => {
    setAuthTab('signup');
    setShowAuth(true);
  }, []);

  const openLogin = useCallback(() => {
    setAuthTab('login');
    setShowAuth(true);
  }, []);

  const handleCheckout = useCallback(() => {
    if (isIncognito) {
      addToast(
        'Orders cannot be placed in incognito mode. Please switch to a normal browser window.',
        'error'
      );
      return;
    }
    setShowCheckout(true);
  }, [isIncognito, addToast]);

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar
        onLogin={openLogin}
        onSignup={openSignup}
        onCategoryChange={setActiveCategory}
        activeCategory={activeCategory}
      />

      <Hero
        onShopNow={() =>
          document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })
        }
      />

      <ProductGrid toast={addToast} activeCategory={activeCategory} />

      <SecuritySection />

      <Footer />

      <CartDrawer onCheckout={handleCheckout} onLogin={openLogin} />

      {showAuth && (
        <AuthModal
          tab={authTab}
          onClose={() => setShowAuth(false)}
          toast={addToast}
        />
      )}

      {showCheckout && (
        <CheckoutModal
          onClose={() => setShowCheckout(false)}
          toast={addToast}
        />
      )}

      {/* Toast stack — bottom right */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5">
        {toasts.map(t => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
