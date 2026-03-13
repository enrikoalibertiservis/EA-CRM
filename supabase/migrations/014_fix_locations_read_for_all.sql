-- Tüm kimlik doğrulanmış kullanıcılar parametrik tabloları okuyabilmeli
-- (brands, vehicle_models, contact_channels, sales_stages, locations)
-- Yönetim (INSERT/UPDATE/DELETE) hâlâ sadece super_admin'e ait

-- ── locations ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "locations_read_all" ON locations;
CREATE POLICY "locations_read_all"
  ON locations FOR SELECT TO authenticated
  USING (true);

-- ── brands ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "brands_read_all" ON brands;
CREATE POLICY "brands_read_all"
  ON brands FOR SELECT TO authenticated
  USING (true);

-- ── vehicle_models ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "models_read_all" ON vehicle_models;
CREATE POLICY "models_read_all"
  ON vehicle_models FOR SELECT TO authenticated
  USING (true);

-- ── contact_channels ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "channels_read_all" ON contact_channels;
CREATE POLICY "channels_read_all"
  ON contact_channels FOR SELECT TO authenticated
  USING (true);

-- ── sales_stages ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "stages_read_all" ON sales_stages;
CREATE POLICY "stages_read_all"
  ON sales_stages FOR SELECT TO authenticated
  USING (true);

-- ── contact_types ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "contact_types_read_all" ON contact_types;
CREATE POLICY "contact_types_read_all"
  ON contact_types FOR SELECT TO authenticated
  USING (true);
