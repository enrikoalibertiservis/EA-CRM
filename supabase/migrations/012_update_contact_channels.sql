-- Mevcut kanalları devre dışı bırak
UPDATE contact_channels SET is_active = FALSE;

-- Yeni kanalları ekle (çakışma varsa güncelle)
INSERT INTO contact_channels (name, slug, icon_name, color, sort_order, is_active) VALUES
  ('Sosyal Medya',    'sosyal-medya',    'share2',        '#EC4899', 1,  TRUE),
  ('Telefon Araması', 'telefon-aramasi', 'phone-call',    '#10B981', 2,  TRUE),
  ('2. El Müşterisi', 'ikinci-el',       'users',         '#F97316', 3,  TRUE),
  ('Servis Müşterisi','servis',          'wrench',        '#3B82F6', 4,  TRUE),
  ('Sigorta Müşterisi','sigorta-musteri','shield',        '#8B5CF6', 5,  TRUE),
  ('Radyo Reklamı',   'radyo',           'radio',         '#F59E0B', 6,  TRUE),
  ('Gazete Reklamı',  'gazete',          'newspaper',     '#6B7280', 7,  TRUE),
  ('Dergi Reklamı',   'dergi',           'book-open',     '#14B8A6', 8,  TRUE),
  ('Google Araması',  'google',          'search',        '#4285F4', 9,  TRUE),
  ('Web Sayfası',     'web',             'globe',         '#06B6D4', 10, TRUE),
  ('Satış Referans',  'satis-referans',  'user-check',    '#EAB308', 11, TRUE),
  ('Sadık Müşteri',   'sadik-musteri',   'heart',         '#EF4444', 12, TRUE),
  ('Diğer',           'diger',           'help-circle',   '#9CA3AF', 13, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name      = EXCLUDED.name,
  icon_name = EXCLUDED.icon_name,
  color     = EXCLUDED.color,
  sort_order= EXCLUDED.sort_order,
  is_active = TRUE;
