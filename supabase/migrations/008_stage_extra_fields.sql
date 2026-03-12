ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS vehicle_info_given           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS followup_datetime            TEXT,
  ADD COLUMN IF NOT EXISTS insurance_kasko_not_done     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS insurance_kasko_fail_reason  TEXT,
  ADD COLUMN IF NOT EXISTS insurance_trafik_not_done    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS insurance_trafik_fail_reason TEXT,
  ADD COLUMN IF NOT EXISTS oto_koruma_not_done          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS oto_koruma_fail_reason       TEXT;
