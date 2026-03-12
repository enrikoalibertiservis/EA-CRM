-- ============================================================
-- VEHICLE MODELS (Araç Modelleri) - Parametric
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_models_brand ON vehicle_models(brand_id);

ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_models_read_all" ON vehicle_models FOR SELECT USING (TRUE);
CREATE POLICY "vehicle_models_admin_insert" ON vehicle_models FOR INSERT WITH CHECK (get_my_role() = 'super_admin');
CREATE POLICY "vehicle_models_admin_update" ON vehicle_models FOR UPDATE USING (get_my_role() = 'super_admin');
CREATE POLICY "vehicle_models_admin_delete" ON vehicle_models FOR DELETE USING (get_my_role() = 'super_admin');

-- Fiat models
INSERT INTO vehicle_models (brand_id, name, sort_order)
SELECT b.id, m.name, m.ord
FROM brands b
CROSS JOIN (VALUES
  ('Egea', 1), ('500e', 2), ('600', 3), ('Topolino', 4),
  ('Grande Panda', 5), ('Doblo Cargo', 6), ('E-Doblo Cargo', 7),
  ('Doblo Combi', 8), ('E-Doblo', 9), ('Scudo', 10),
  ('Scudo Combi/Combimix', 11), ('Ulysse', 12),
  ('Ducato Van', 13), ('Ducato Kamyonet', 14)
) AS m(name, ord)
WHERE b.slug = 'fiat'
ON CONFLICT DO NOTHING;
