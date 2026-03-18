import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_ROLES = ['super_admin', 'manager']

// Column name aliases (lowercase) → canonical key
const COL_MAP: Record<string, string> = {
  'ad soyad': 'full_name', 'ad_soyad': 'full_name', 'isim': 'full_name', 'müşteri': 'full_name',
  'telefon': 'phone', 'gsm': 'phone', 'cep': 'phone',
  'marka': 'brand',
  'danışman': 'consultant', 'sorumlu': 'consultant',
  'lokasyon': 'location', 'şube': 'location',
  'kayıt tarihi': 'created_at', 'tarih': 'created_at', 'kayit tarihi': 'created_at',
  'ilgilendiği model': 'interested_model', 'model': 'interested_model', 'ilgilenilen model': 'interested_model',
  'nereden ulaştı?': 'channel', 'nereden ulaştı': 'channel', 'nereden ulasti': 'channel', 'kaynak': 'channel', 'kanal': 'channel',
  'aşama': 'stage', 'asama': 'stage', 'süreç': 'stage',
  'durum': 'status',
  'il': 'city',
  'ilçe': 'district', 'ilce': 'district',
  'not': 'notes', 'notlar': 'notes',
}

// Safely convert any Excel cell value to a string
function cellStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString()
  return String(v).trim()
}

// Excel serial date (number) to YYYY-MM-DD
function excelSerialToDate(serial: number): string {
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000))
  return date.toISOString().split('T')[0]
}

function parseDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null

  // JS Date object (from cellDates: true)
  if (raw instanceof Date) return raw.toISOString().split('T')[0]

  // Excel serial number
  if (typeof raw === 'number') return excelSerialToDate(raw)

  const s = String(raw).trim()
  if (!s) return null

  // ISO: YYYY-MM-DDT...
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  // GG.AA.YYYY
  const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`

  // DD/MM/YYYY
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`

  // M/D/YYYY (ABD formatı, fallback)
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`

  return null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (!ALLOWED_ROLES.includes(profile?.role ?? ''))
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })

  let body: { rows?: unknown[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek formatı' }, { status: 400 })
  }

  const rawRows = body.rows ?? []
  if (!rawRows.length) return NextResponse.json({ error: 'Dosyada veri bulunamadı' }, { status: 400 })

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

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

  const findId = (list: { id: string; name: string }[] | null, val: string) => {
    if (!list || !val.trim()) return null
    const n = normalize(val)
    return list.find(x => normalize(x.name) === n)?.id ?? null
  }

  const consultantList = (consultants ?? []).map(c => ({ id: c.id, name: c.full_name }))

  const toInsert: Record<string, unknown>[] = []
  const skipped: { row: number; reason: string }[] = []

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i] as Record<string, unknown>

    // Map column headers to canonical keys
    const r: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(raw)) {
      const mapped = COL_MAP[normalize(k)]
      if (mapped) r[mapped] = v
    }

    const full_name = cellStr(r.full_name)
    const phone     = cellStr(r.phone).replace(/\s/g, '')

    if (!full_name) { skipped.push({ row: i + 2, reason: 'Ad Soyad boş' }); continue }
    if (!phone)     { skipped.push({ row: i + 2, reason: 'Telefon boş' }); continue }

    // Ensure phone starts with 0 (Excel strips leading zero)
    const phoneFinal = phone.startsWith('0') ? phone : `0${phone}`

    const brand_id          = findId(brands,         cellStr(r.brand))
    const consultant_id     = findId(consultantList, cellStr(r.consultant))
    const location_id       = findId(locations,       cellStr(r.location))
    const source_channel_id = findId(channels,        cellStr(r.channel))
    const current_stage_id  = findId(stages,          cellStr(r.stage))

    if (!brand_id)    { skipped.push({ row: i + 2, reason: `Marka bulunamadı: "${cellStr(r.brand)}"` }); continue }
    if (!location_id) { skipped.push({ row: i + 2, reason: `Lokasyon bulunamadı: "${cellStr(r.location)}"` }); continue }

    const dateStr  = parseDate(r.created_at) ?? new Date().toISOString().split('T')[0]
    const statusNorm = normalize(cellStr(r.status))
    const is_won   = statusNorm === 'satış yapıldı' || statusNorm === 'satis yapildi'
    const is_lost  = statusNorm === 'kaybedildi'

    toInsert.push({
      full_name,
      phone: phoneFinal,
      brand_id,
      consultant_id: consultant_id ?? user.id,
      location_id,
      source_channel_id: source_channel_id ?? null,
      current_stage_id:  current_stage_id  ?? null,
      interested_model:  cellStr(r.interested_model)  || null,
      city:     cellStr(r.city)     || null,
      district: cellStr(r.district) || null,
      notes:    cellStr(r.notes)    || null,
      is_won,
      is_lost,
      is_active: true,
      created_by: user.id,
      created_at: `${dateStr}T12:00:00+03:00`,
    })
  }

  let savedCount = 0
  const errors: { row: number; reason: string }[] = []

  // Batch insert (up to 50 at a time)
  const BATCH = 50
  for (let b = 0; b < toInsert.length; b += BATCH) {
    const batch = toInsert.slice(b, b + BATCH)
    const { error } = await supabase.from('customers').insert(batch)
    if (error) {
      // Fall back to one-by-one to identify the bad row
      for (let j = 0; j < batch.length; j++) {
        const { error: rowErr } = await supabase.from('customers').insert(batch[j])
        if (rowErr) errors.push({ row: b + j + 2, reason: rowErr.message })
        else savedCount++
      }
    } else {
      savedCount += batch.length
    }
  }

  return NextResponse.json({ savedCount, skipped, errors })
}
