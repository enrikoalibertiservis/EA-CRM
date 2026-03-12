-- ============================================================
-- Add department column to user_profiles
-- ============================================================
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS department TEXT
  CHECK (department IN ('satis', 'servis', 'yonetim', 'muhasebe', 'diger'));

-- ============================================================
-- Update location names
-- ============================================================
UPDATE locations SET name = 'Enriko Aliberti' WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE locations SET name = 'İncesu Otomotiv' WHERE id = '00000000-0000-0000-0000-000000000002';
