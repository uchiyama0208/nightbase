-- Create tables table
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  x INTEGER NOT NULL DEFAULT 0,
  y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 100,
  height INTEGER NOT NULL DEFAULT 100,
  shape TEXT NOT NULL DEFAULT 'rect', -- 'rect', 'circle'
  capacity INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table_sessions table
CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  main_guest_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Optional link to guest profile
  guest_count INTEGER NOT NULL DEFAULT 1,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ, -- NULL means active
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'payment_pending', 'closed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create cast_assignments table (Tsukemawashi)
CREATE TABLE IF NOT EXISTS cast_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  cast_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'jounai', -- 'jounai', 'shime', 'free', 'help'
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  cast_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Optional, for cast drinks
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Staff/Cast who took the order
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bill_settings table
CREATE TABLE IF NOT EXISTS bill_settings (
  store_id UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  hourly_charge INTEGER NOT NULL DEFAULT 3000,
  extension_fee_30m INTEGER NOT NULL DEFAULT 1500,
  extension_fee_60m INTEGER NOT NULL DEFAULT 3000,
  shime_fee INTEGER NOT NULL DEFAULT 2000,
  jounai_fee INTEGER NOT NULL DEFAULT 1000,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.10,
  service_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cast_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Simplified for now: authenticated users can read/write their store's data)
-- In a real app, we would restrict based on roles (e.g., only staff/admin can manage tables)

-- Tables
CREATE POLICY "Users can view tables in their store" ON tables
  FOR SELECT USING (store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage tables in their store" ON tables
  FOR ALL USING (store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid()));

-- Table Sessions
CREATE POLICY "Users can view sessions in their store" ON table_sessions
  FOR SELECT USING (store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage sessions in their store" ON table_sessions
  FOR ALL USING (store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid()));

-- Cast Assignments
CREATE POLICY "Users can view assignments in their store" ON cast_assignments
  FOR SELECT USING (
    table_session_id IN (SELECT id FROM table_sessions WHERE store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Users can manage assignments in their store" ON cast_assignments
  FOR ALL USING (
    table_session_id IN (SELECT id FROM table_sessions WHERE store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid()))
  );

-- Orders
CREATE POLICY "Users can view orders in their store" ON orders
  FOR SELECT USING (
    table_session_id IN (SELECT id FROM table_sessions WHERE store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Users can manage orders in their store" ON orders
  FOR ALL USING (
    table_session_id IN (SELECT id FROM table_sessions WHERE store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid()))
  );

-- Bill Settings
CREATE POLICY "Users can view bill settings in their store" ON bill_settings
  FOR SELECT USING (store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage bill settings in their store" ON bill_settings
  FOR ALL USING (store_id IN (SELECT store_id FROM profiles WHERE id = auth.uid()));
