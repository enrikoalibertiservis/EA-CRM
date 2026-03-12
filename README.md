# EA Motors CRM

Fiat, Alfa Romeo, Jeep ve İkinci El yetkili bayi için geliştirilmiş tam kapsamlı CRM sistemi.

## Özellikler

- **Google OAuth zorunlu giriş** — Supabase Auth + Google
- **Marka bazlı müşteri yönetimi** — Fiat, Alfa Romeo, Jeep, İkinci El
- **Satış pipeline'ı** — 6 aşamalı, değiştirilemez geçmiş (audit trail)
- **İletişim logu** — 9 temas kanalı, süre, sonuç, sonraki aksiyon
- **Dashboard** — Marka hunileri, gün/saat yoğunluk haritası, kanal dağılımı
- **Bergama Şube Raporu** — Ayrı danışman performansı + dönüşüm analitiği
- **RLS ile güvenlik** — Kullanıcı/lokasyon bazlı veri izolasyonu

## Kurulum

### 1. Supabase Projesi Oluştur

1. [supabase.com](https://supabase.com) adresine git
2. Yeni proje oluştur
3. **Authentication → Providers → Google** aktif et, Client ID ve Secret gir
4. **Redirect URL** olarak `https://your-domain.com/auth/callback` ekle

### 2. Veritabanı Şemasını Kur

Supabase SQL Editor'da `supabase/migrations/001_initial_schema.sql` dosyasını çalıştır.

### 3. Ortam Değişkenlerini Ayarla

`.env.local` dosyasını güncelle:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxx
```

### 4. İlk Kullanıcıyı Oluştur

1. Google ile sisteme ilk giriş yap
2. Supabase'de `user_profiles` tablosuna manuel kayıt ekle:

```sql
INSERT INTO user_profiles (id, full_name, role, location_id)
VALUES (
  'auth.users tablosundaki UUID',
  'Adınız Soyadınız',
  'super_admin',
  '00000000-0000-0000-0000-000000000001'  -- Merkez lokasyon
);
```

### 5. Uygulamayı Çalıştır

```bash
npm install
npm run dev
```

## Sayfa Yapısı

| URL | Açıklama | Erişim |
|-----|----------|--------|
| `/login` | Google OAuth giriş | Herkese açık |
| `/dashboard` | Ana panel | Tüm roller |
| `/customers` | Müşteri listesi (filtreli) | Tüm roller |
| `/customers/new` | Yeni müşteri formu | Tüm roller |
| `/customers/[id]` | Müşteri detay + pipeline | Tüm roller |
| `/reports/main` | Merkez raporu | Manager + Admin |
| `/reports/bergama` | Bergama raporu | Sadece Super Admin |
| `/settings/users` | Kullanıcı yönetimi | Sadece Super Admin |

## Kullanıcı Rolleri

| Rol | Yetki |
|-----|-------|
| `super_admin` | Her şeyi görür, Bergama dahil |
| `manager` | Kendi lokasyonunun tüm müşterileri |
| `consultant` | Sadece kendi müşterileri |

## Satış Aşamaları

1. **Araç Tanıtımı** — Araç gösterimi yapıldı
2. **Teklif** — Fiyat teklifi sunuldu
3. **Düşünme Süreci** — Müşteri karar aşamasında
4. **Kabul** — Teklif kabul edildi
5. **Sigorta İşlemleri** — Sigorta süreci
6. **Oto Koruma** — Tamamlandı (final aşama)

## Temas Kanalları

Showroom Ziyaret, Telefon, WhatsApp, E-posta, Web Sitesi, Sosyal Medya, Referans, Fuar/Etkinlik, Diğer

## Teknik Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** + Lucide React
- **Supabase** (PostgreSQL + Auth + RLS)
- **Recharts** (grafikler)
- **Sonner** (bildirimler)
