-- ============================================================
-- EA-CRM Otomotiv CRM - Initial Schema
-- Fiat | Alfa Romeo | Jeep | İkinci El
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- LOCATIONS (Lokasyonlar)
-- ============================================================
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('main', 'satellite')),
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO locations (id, name, type, address) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Merkez Bayi', 'main', 'Merkez'),
  ('00000000-0000-0000-0000-000000000002', 'Bergama Şube', 'satellite', 'Bergama, İzmir');

-- ============================================================
-- BRANDS (Markalar)
-- ============================================================
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  icon_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO brands (name, slug, color, text_color, icon_name) VALUES
  ('Fiat', 'fiat', '#CC0000', '#FFFFFF', 'car'),
  ('Alfa Romeo', 'alfa-romeo', '#8B0000', '#FFFFFF', 'shield'),
  ('Jeep', 'jeep', '#2D5016', '#FFFFFF', 'mountain-snow'),
  ('İkinci El', 'ikinci-el', '#4A5568', '#FFFFFF', 'refresh-cw');

-- ============================================================
-- USER PROFILES (Kullanıcı Profilleri)
-- Extends auth.users
-- ============================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'consultant' CHECK (role IN ('super_admin', 'manager', 'consultant')),
  location_id UUID REFERENCES locations(id) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- CONTACT CHANNELS (Temas Kanalları)
-- ============================================================
CREATE TABLE contact_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO contact_channels (name, slug, icon_name, color, sort_order) VALUES
  ('Showroom Ziyaret', 'showroom', 'store', '#2563EB', 1),
  ('Telefon', 'phone', 'phone', '#16A34A', 2),
  ('WhatsApp', 'whatsapp', 'message-circle', '#25D366', 3),
  ('E-posta', 'email', 'mail', '#7C3AED', 4),
  ('Web Sitesi', 'website', 'globe', '#0891B2', 5),
  ('Sosyal Medya', 'social-media', 'instagram', '#E1306C', 6),
  ('Referans', 'referral', 'users', '#D97706', 7),
  ('Fuar / Etkinlik', 'event', 'calendar', '#DC2626', 8),
  ('Diğer', 'other', 'more-horizontal', '#6B7280', 9);

-- ============================================================
-- SALES STAGES (Satış Aşamaları)
-- ============================================================
CREATE TABLE sales_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_name TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_final BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sales_stages (name, slug, description, icon_name, color, sort_order, is_final) VALUES
  ('Araç Tanıtımı', 'arac-tanitimi', 'Danışman müşteriye araç tanıttı', 'car', '#3B82F6', 1, FALSE),
  ('Teklif', 'teklif', 'Fiyat teklifi sunuldu', 'file-text', '#8B5CF6', 2, FALSE),
  ('Düşünme Süreci', 'dusunme', 'Müşteri karar sürecinde', 'clock', '#F59E0B', 3, FALSE),
  ('Kabul', 'kabul', 'Müşteri teklifi kabul etti', 'check-circle', '#10B981', 4, FALSE),
  ('Sigorta İşlemleri', 'sigorta', 'Sigorta işlemleri yürütülüyor', 'shield', '#06B6D4', 5, FALSE),
  ('Oto Koruma', 'oto-koruma', 'Oto koruma / kaplama tamamlandı', 'lock', '#6366F1', 6, TRUE);

-- ============================================================
-- CUSTOMERS (Müşteriler)
-- ============================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Kişisel Bilgiler
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_alt TEXT,
  email TEXT,
  tc_no TEXT,
  birth_date DATE,
  address TEXT,
  city TEXT,
  district TEXT,
  -- CRM Bilgileri
  brand_id UUID NOT NULL REFERENCES brands(id),
  source_channel_id UUID REFERENCES contact_channels(id),
  interested_model TEXT,
  notes TEXT,
  -- Atama
  consultant_id UUID REFERENCES user_profiles(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  -- Durum
  current_stage_id UUID REFERENCES sales_stages(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_won BOOLEAN NOT NULL DEFAULT FALSE,
  is_lost BOOLEAN NOT NULL DEFAULT FALSE,
  lost_reason TEXT,
  -- Zorunlu alanlar
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CUSTOMER STAGE HISTORY (Aşama Geçmişi - Değiştirilemez)
-- ============================================================
CREATE TABLE customer_stage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES sales_stages(id),
  note TEXT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entered_by UUID NOT NULL REFERENCES auth.users(id)
  -- NOT: Bu tablo INSERT-ONLY. UPDATE/DELETE yasak (RLS ile).
);

-- ============================================================
-- CONTACT LOGS (İletişim Geçmişi)
-- ============================================================
CREATE TABLE contact_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES contact_channels(id),
  contact_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER,
  note TEXT,
  outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative', 'no_answer')),
  next_action TEXT,
  next_action_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- ============================================================
-- VEHICLE INTERESTS (Araç İlgi Kaydı)
-- ============================================================
CREATE TABLE vehicle_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id),
  model TEXT NOT NULL,
  year INTEGER,
  color TEXT,
  fuel_type TEXT CHECK (fuel_type IN ('benzin', 'dizel', 'hybrid', 'elektrik', 'lpg', 'diger')),
  transmission TEXT CHECK (transmission IN ('manuel', 'otomatik', 'yari_otomatik')),
  budget_min NUMERIC(12,2),
  budget_max NUMERIC(12,2),
  offered_price NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- ============================================================
-- OFFERS (Teklifler - Tarihsel olarak değiştirilemez)
-- ============================================================
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  vehicle_interest_id UUID REFERENCES vehicle_interests(id),
  offer_number TEXT NOT NULL UNIQUE,
  -- Araç Bilgisi
  brand_id UUID NOT NULL REFERENCES brands(id),
  model TEXT NOT NULL,
  year INTEGER,
  color TEXT,
  -- Fiyatlandırma
  list_price NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  final_price NUMERIC(12,2) NOT NULL,
  -- Durum
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until DATE,
  notes TEXT,
  -- Finalize edildi mi (sonrası değiştirilemez)
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES auth.users(id),
  -- Zorunlu alanlar
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  location_id UUID NOT NULL REFERENCES locations(id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_customers_brand ON customers(brand_id);
CREATE INDEX idx_customers_consultant ON customers(consultant_id);
CREATE INDEX idx_customers_location ON customers(location_id);
CREATE INDEX idx_customers_stage ON customers(current_stage_id);
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE INDEX idx_contact_logs_customer ON contact_logs(customer_id);
CREATE INDEX idx_contact_logs_date ON contact_logs(contact_date);
CREATE INDEX idx_contact_logs_channel ON contact_logs(channel_id);
CREATE INDEX idx_stage_history_customer ON customer_stage_history(customer_id);
CREATE INDEX idx_offers_customer ON offers(customer_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's profile
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS user_profiles AS $$
  SELECT * FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's location_id
CREATE OR REPLACE FUNCTION get_my_location_id()
RETURNS UUID AS $$
  SELECT location_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Locations: Everyone can read
CREATE POLICY "locations_read_all" ON locations FOR SELECT USING (TRUE);

-- Brands: Everyone can read
CREATE POLICY "brands_read_all" ON brands FOR SELECT USING (TRUE);

-- Contact Channels: Everyone can read
CREATE POLICY "channels_read_all" ON contact_channels FOR SELECT USING (TRUE);

-- Sales Stages: Everyone can read
CREATE POLICY "stages_read_all" ON sales_stages FOR SELECT USING (TRUE);

-- User Profiles: Users see their own profile, managers/admins see their location's users
CREATE POLICY "profiles_read_own" ON user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR get_my_role() IN ('super_admin', 'manager')
  );

CREATE POLICY "profiles_insert_admin" ON user_profiles FOR INSERT
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "profiles_update_own_or_admin" ON user_profiles FOR UPDATE
  USING (id = auth.uid() OR get_my_role() = 'super_admin');

-- Customers: Consultants see own, managers see their location, super_admin sees all
CREATE POLICY "customers_select" ON customers FOR SELECT
  USING (
    get_my_role() = 'super_admin'
    OR (get_my_role() = 'manager' AND location_id = get_my_location_id())
    OR (get_my_role() = 'consultant' AND consultant_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "customers_insert" ON customers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "customers_update" ON customers FOR UPDATE
  USING (
    get_my_role() = 'super_admin'
    OR (get_my_role() = 'manager' AND location_id = get_my_location_id())
    OR (get_my_role() = 'consultant' AND consultant_id = auth.uid())
    OR created_by = auth.uid()
  );

-- Stage History: INSERT only (no update/delete)
CREATE POLICY "stage_history_select" ON customer_stage_history FOR SELECT
  USING (
    get_my_role() = 'super_admin'
    OR entered_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM customers c WHERE c.id = customer_id
      AND (
        (get_my_role() = 'manager' AND c.location_id = get_my_location_id())
        OR c.consultant_id = auth.uid()
      )
    )
  );

CREATE POLICY "stage_history_insert" ON customer_stage_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- NO UPDATE/DELETE policies on stage_history = immutable

-- Contact Logs: Same as customers
CREATE POLICY "contact_logs_select" ON contact_logs FOR SELECT
  USING (
    get_my_role() = 'super_admin'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM customers c WHERE c.id = customer_id
      AND (
        (get_my_role() = 'manager' AND c.location_id = get_my_location_id())
        OR c.consultant_id = auth.uid()
      )
    )
  );

CREATE POLICY "contact_logs_insert" ON contact_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "contact_logs_update" ON contact_logs FOR UPDATE
  USING (created_by = auth.uid() OR get_my_role() IN ('super_admin', 'manager'));

-- Vehicle Interests: Same pattern
CREATE POLICY "vehicle_interests_select" ON vehicle_interests FOR SELECT
  USING (
    get_my_role() = 'super_admin'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM customers c WHERE c.id = customer_id
      AND (
        (get_my_role() = 'manager' AND c.location_id = get_my_location_id())
        OR c.consultant_id = auth.uid()
      )
    )
  );

CREATE POLICY "vehicle_interests_insert" ON vehicle_interests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Offers
CREATE POLICY "offers_select" ON offers FOR SELECT
  USING (
    get_my_role() = 'super_admin'
    OR (get_my_role() = 'manager' AND location_id = get_my_location_id())
    OR created_by = auth.uid()
  );

CREATE POLICY "offers_insert" ON offers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Finalized offers cannot be updated
CREATE POLICY "offers_update" ON offers FOR UPDATE
  USING (finalized_at IS NULL AND (created_by = auth.uid() OR get_my_role() IN ('super_admin', 'manager')));

-- ============================================================
-- OFFER NUMBER SEQUENCE
-- ============================================================
CREATE SEQUENCE offer_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_offer_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TKL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('offer_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
