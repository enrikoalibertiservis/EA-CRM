import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_ROLES = ['super_admin', 'manager']

// Column name aliases (lowercase → canonical key)
const COL_MAP: Record<string, string> = {
  'ad soyad': 'full_name', 'ad_soyad': 'full_name', 'isim': 'full_name', 'müşteri': 'full_name',
  'telefon': 'phone', 'gsm': 'phone', 'cep': 'phone',
  'marka': 'brand',
  'danışman': 'consultant', 'danisман': 'consultant', 'sorumlu': 'consultant',
  'lokasyon': 'location', 'şube': 'location',
  'kayıt tarihi': 'created_at', 'tarih': 'created_at', 'kayit tarihi': 'created_at',
  'ilgilendiği model': 'interested_model', 'model': 'interested_model', 'ilgilenilen model': 'interested_model',
  'nereden ulaştı': 'channel', 'nereden ulasti': 'channel', 'kaynak': 'channel', 'kanal': 'channel',
  'aşama': 'stage', 'asama': 'stage', 'süreç': 'stage',
  'durum': 'status',
  'il': 'city',
  'ilçe': 'district', 'ilce': 'district',
  'not': 'notes', 'notlar': 'notes',
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  const s = raw.trim()
  // GG.AA.YYYY
  const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  // YYYY-MM-DD
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`
  // DD/MM/YYYY
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`
  return null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (!ALLOWED_ROLES.includes(profile?.role ?? ''))
    return NextResponse.json({ error: 'Yetersiz yetki' }, { status: 403 })

  const body = await req.json()
  const rows: Record<string, string>[] = body.rows ?? []

  if (!rows.length) return NextResponse.json({ error: 'Veri bulunamadı' }, { status: 400 })

  // Lookup tables
  const [
    { data: brands },
    { data: consultants },
    { data: locations },
    { data: channels },
    { data: stages },
  ] = await Promise.all([
    supabase.from('brands').select('id, name'),
    supabase.from('user_profiles').select('id, full_name').eq('is_active', true),
    supabase.from('locations').select('id, name'),
    supabase.from('contact_channels').select('id, name'),
    supabase.from('sales_stages').select('id, name, slug').eq('is_active', true),
  ])

  const normalize = (s: string) => s?.trim().toLowerCase().replace(/\s+/g, ' ') ?? ''

  const findId = (list: { id: string; name: string }[] | null, val: string) => {
    if (!list || !val) return null
    const n = normalize(val)
    return list.find(x => normalize(x.name) === n)?.id ?? null
  }

  // Normalize consultants to { id, name } shape
  const consultantList = (consultants ?? []).map(c => ({ id: c.id, name: c.full_name }))

  const inserted: Record<string, string>[] = []
  const skipped: { row: number; reason: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]

    // Normalize keys
    const r: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      const mapped = COL_MAP[normalize(k)]
      if (mapped) r[mapped] = v?.trim() ?? ''
    }

    const full_name = r.full_name
    const phone     = r.phone

    if (!full_name) { skipped.push({ row: i + 2, reason: 'Ad Soyad boş' }); continue }
    if (!phone)     { skipped.push({ row: i + 2, reason: 'Telefon boş' }); continue }

    const brand_id          = findId(brands, r.brand)
    const consultant_id     = findId(consultantList, r.consultant)
    const location_id       = findId(locations, r.location)
    const source_channel_id = findId(channels, r.channel)
    const current_stage_id  = findId(stages, r.stage)

    if (!brand_id)    { skipped.push({ row: i + 2, reason: `Marka bulunamadı: "${r.brand}"` }); continue }
    if (!location_id) { skipped.push({ row: i + 2, reason: `Lokasyon bulunamadı: "${r.location}"` }); continue }

    const dateStr = parseDate(r.created_at) ?? new Date().toISOString().split('T')[0]

    const is_won  = normalize(r.status) === 'satış yapıldı'
    const is_lost = normalize(r.status) === 'kaybedildi'

    inserted.push({
      full_name,
      phone,
      brand_id,
      consultant_id: consultant_id ?? user.id,
      location_id,
      source_channel_id,
      current_stage_id,
      interested_model: r.interested_model || null,
      city: r.city || null,
      district: r.district || null,
      notes: r.notes || null,
      is_won,
      is_lost,
      is_active: true,
      created_by: user.id,
      created_at: `${dateStr}T12:00:00+03:00`,
    } as unknown as Record<string, string>)
  }

  let savedCount = 0
  const errors: { row: number; reason: string }[] = []

  for (let i = 0; i < inserted.length; i++) {
    const { error } = await supabase.from('customers').insert(inserted[i])
    if (error) errors.push({ row: i + 2, reason: error.message })
    else savedCount++
  }

  return NextResponse.json({ savedCount, skipped, errors })
}
