-- Sigorta ve Oto Koruma takip alanları
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS insurance_kasko_offered  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS insurance_trafik_offered BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS oto_koruma_offered       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS oto_koruma_sold          BOOLEAN NOT NULL DEFAULT FALSE;
