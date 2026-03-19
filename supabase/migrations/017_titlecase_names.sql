-- Müşteri adlarının ilk harflerini büyük yap (initcap: "AHMET YILMAZ" → "Ahmet Yılmaz")
UPDATE customers
SET full_name = initcap(full_name)
WHERE is_active = true
  AND full_name IS NOT NULL;

-- Kullanıcı adlarının ilk harflerini büyük yap
UPDATE user_profiles
SET full_name = initcap(full_name)
WHERE full_name IS NOT NULL;
