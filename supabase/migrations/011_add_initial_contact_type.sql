-- Migration: Add initial_contact_type to customers
-- Values: 'visit' (Ziyaret) | 'inbound_call' (Gelen Çağrı)

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS initial_contact_type TEXT;
