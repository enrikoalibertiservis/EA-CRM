-- Bağlantı Süreci ve Satış aşaması alanları
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS verbal_agreement_done BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sale_completed        BOOLEAN NOT NULL DEFAULT FALSE;
