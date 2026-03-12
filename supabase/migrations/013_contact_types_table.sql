-- Temas Türü parametrik tablosu
CREATE TABLE IF NOT EXISTS contact_types (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        NOT NULL UNIQUE,
  icon_name   TEXT,
  color       TEXT        NOT NULL DEFAULT '#6B7280',
  sort_order  INT         NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE contact_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_types_read" ON contact_types FOR SELECT USING (true);
CREATE POLICY "contact_types_admin" ON contact_types FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Varsayılan değerler
INSERT INTO contact_types (name, slug, icon_name, color, sort_order) VALUES
  ('Ziyaret',     'visit',         'building2',  '#6366F1', 1),
  ('Gelen Çağrı', 'inbound_call',  'phone-call', '#10B981', 2)
ON CONFLICT (slug) DO NOTHING;
