-- Teklif, kabul ve oto koruma ek alanları
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS offer_amount       NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS offer_campaign     TEXT,
  ADD COLUMN IF NOT EXISTS offer_accepted     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS oto_koruma_product TEXT,
  ADD COLUMN IF NOT EXISTS oto_koruma_amount  NUMERIC(12,2);
