CREATE TABLE IF NOT EXISTS lost_reasons (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id)
);

ALTER TABLE lost_reasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read lost_reasons" ON lost_reasons;
DROP POLICY IF EXISTS "Admins can manage lost_reasons"            ON lost_reasons;

CREATE POLICY "Authenticated users can read lost_reasons"
  ON lost_reasons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage lost_reasons"
  ON lost_reasons FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DO $$
DECLARE
  reasons text[] := ARRAY[
    'Fiyat yüksek bulundu',
    'Rakip firmayı tercih etti',
    'Başka marka / model tercih etti',
    'Araç stokta yok',
    'Finansman / kredi sağlanamadı',
    'Bütçe yetersiz',
    'Müşteri kararını erteledi',
    'Müşteriye ulaşılamıyor',
    'Müşteri kendi vazgeçti'
  ];
  i int;
BEGIN
  FOR i IN 1..array_length(reasons, 1) LOOP
    INSERT INTO lost_reasons (name, sort_order)
    VALUES (reasons[i], i - 1)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
