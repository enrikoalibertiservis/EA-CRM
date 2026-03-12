-- Fix RLS: allow super_admin to manage parametric tables
-- (brands, vehicle_models, contact_channels, sales_stages, locations)

-- ── contact_channels ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "channels_admin_all" ON contact_channels;
CREATE POLICY "channels_admin_all"
  ON contact_channels FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ── brands ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "brands_admin_all" ON brands;
CREATE POLICY "brands_admin_all"
  ON brands FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ── vehicle_models ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "models_admin_all" ON vehicle_models;
CREATE POLICY "models_admin_all"
  ON vehicle_models FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ── sales_stages ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "stages_admin_all" ON sales_stages;
CREATE POLICY "stages_admin_all"
  ON sales_stages FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ── locations ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "locations_admin_all" ON locations;
CREATE POLICY "locations_admin_all"
  ON locations FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
