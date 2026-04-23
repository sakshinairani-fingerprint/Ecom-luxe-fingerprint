-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  visitor_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  category VARCHAR(100),
  badge VARCHAR(50),
  stock INTEGER DEFAULT 100
);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT true
);

-- Coupon redemptions (for abuse detection)
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id SERIAL PRIMARY KEY,
  coupon_code VARCHAR(50) NOT NULL,
  visitor_id VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  redeemed_at TIMESTAMP DEFAULT NOW()
);

-- Fingerprint events log
CREATE TABLE IF NOT EXISTS fingerprint_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  visitor_id VARCHAR(255),
  event_type VARCHAR(50),
  event_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed products
INSERT INTO products (name, description, price, image_url, category, badge) VALUES
(
  'Pro Wireless Headphones',
  'Premium noise-canceling headphones with 30hr battery life, Hi-Res audio certification, and multi-device pairing.',
  299.00,
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&q=80',
  'Electronics',
  'Best Seller'
),
(
  'Smart Watch Series X',
  'Advanced health & fitness tracking with always-on AMOLED display, GPS, and 18-day battery life.',
  399.00,
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop&q=80',
  'Electronics',
  'New'
),
(
  'Mirrorless Camera 4K',
  'Professional 33MP mirrorless camera with in-body stabilization and 4K60 video recording.',
  1299.00,
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=600&fit=crop&q=80',
  'Electronics',
  NULL
),
(
  'Air Runner Sneakers',
  'Ultra-lightweight running shoes with adaptive foam cushioning and breathable engineered mesh upper.',
  180.00,
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&q=80',
  'Fashion',
  'Popular'
),
(
  'Premium Leather Jacket',
  'Full-grain vegetable-tanned leather with satin lining. Slim cut, timeless design.',
  320.00,
  'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=600&fit=crop&q=80',
  'Fashion',
  NULL
),
(
  'Classic Aviator Sunglasses',
  'Polarized glass lenses with UV400 protection. Lightweight titanium frame in antique gold.',
  195.00,
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=600&fit=crop&q=80',
  'Fashion',
  NULL
),
(
  'Arc Floor Lamp',
  'Minimalist arc lamp with stepless dimming, warm-to-cool LED (2700–5000K), and solid marble base.',
  89.00,
  'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&h=600&fit=crop&q=80',
  'Home',
  NULL
),
(
  'Barista Espresso Machine',
  'Italian-engineered 15-bar espresso machine with steam wand and pre-infusion technology.',
  249.00,
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop&q=80',
  'Home',
  'New'
),
(
  'Botanical Candle Set',
  'Set of 3 hand-poured soy candles — rose, eucalyptus & amber — each with 60hr burn time.',
  65.00,
  'https://images.unsplash.com/photo-1602178506210-dd5283a4b8e9?w=600&h=600&fit=crop&q=80',
  'Home',
  NULL
),
(
  'Performance Yoga Mat',
  'Non-slip 6mm eco-cork mat with alignment guides, carry strap, and natural antimicrobial properties.',
  88.00,
  'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&h=600&fit=crop&q=80',
  'Wellness',
  NULL
),
(
  'Insulated Tumbler 32oz',
  'Triple-wall vacuum insulation keeps drinks cold 48hr or hot 24hr. Leak-proof lid.',
  55.00,
  'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=600&fit=crop&q=80',
  'Wellness',
  'Popular'
),
(
  'Signature Eau de Parfum',
  'A warm, woody fragrance — bergamot and cardamom open into jasmine, base of sandalwood and amber.',
  185.00,
  'https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&h=600&fit=crop&q=80',
  'Wellness',
  NULL
)
ON CONFLICT DO NOTHING;

-- Seed coupons
INSERT INTO coupons (code, discount_percent, description) VALUES
('SAVE10', 10, '10% off your entire order'),
('WELCOME20', 20, '20% off for new customers'),
('FLASH30', 30, '30% flash sale — limited time')
ON CONFLICT DO NOTHING;
