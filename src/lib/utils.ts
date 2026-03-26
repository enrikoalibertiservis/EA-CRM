import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null, opts?: { time?: boolean }): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (opts?.time) {
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return phone
  // (0532) 123 45 67
  return `(${digits.slice(0, 4)}) ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
export const DAYS_FULL_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

export const OUTCOME_LABELS: Record<string, string> = {
  positive: 'Olumlu',
  neutral: 'Nötr',
  negative: 'Olumsuz',
  no_answer: 'Cevap Yok',
}

export const OUTCOME_COLORS: Record<string, string> = {
  positive: '#10B981',
  neutral: '#6B7280',
  negative: '#EF4444',
  no_answer: '#F59E0B',
}

// ── Stage action helpers (shared across list, dashboard, reports) ─────────────

/** Hangi stage slug'ı için hangi müşteri alanları "aksiyon alındı" anlamına gelir */
export const STAGE_ACTION_FIELDS: Record<string, string[]> = {
  'arac-tanitimi':     ['vehicle_info_given', 'test_drive_done', 'catalog_given'],
  'teklif':            ['offer_written', 'offer_amount', 'offer_campaign'],
  'dusunme':           ['followup_done', 'followup_datetime'],
  'baglanti-sureci':   ['verbal_agreement_done'],
  'baglanti':          ['verbal_agreement_done'],
  'satis':             ['sale_completed'],
  'kabul':             ['offer_accepted', 'deposit_received', 'contract_signed'],
  'sigorta':           ['insurance_kasko_offered', 'insurance_kasko_not_done', 'insurance_trafik_offered', 'insurance_trafik_not_done'],
  'sigorta-islemleri': ['insurance_kasko_offered', 'insurance_kasko_not_done', 'insurance_trafik_offered', 'insurance_trafik_not_done'],
  'oto-koruma':        ['oto_koruma_sold', 'oto_koruma_not_done', 'oto_koruma_product', 'oto_koruma_amount'],
}

/** Supabase select string — stage aksiyonlarını sorgulamak için gereken alanlar */
export const STAGE_ACTION_SELECT =
  'vehicle_info_given, test_drive_done, catalog_given, offer_written, offer_amount, offer_campaign, followup_done, followup_datetime, verbal_agreement_done, sale_completed, offer_accepted, deposit_received, contract_signed, insurance_kasko_offered, insurance_kasko_not_done, insurance_trafik_offered, insurance_trafik_not_done, oto_koruma_sold, oto_koruma_not_done, oto_koruma_product, oto_koruma_amount'

/** Verilen stage slug'ı için müşteride en az bir aksiyon alınmış mı? */
export function stageHasAction(record: Record<string, unknown>, slug: string): boolean {
  const fields = STAGE_ACTION_FIELDS[slug]
  if (!fields || fields.length === 0) return true
  return fields.some(f => {
    const v = record[f]
    return v !== null && v !== undefined && v !== false && v !== ''
  })
}

/** Aksiyon alınmış son aşamanın ID'sini döner (aksiyon yoksa bir öncekine gider) */
export function getEffectiveStageId(
  record: Record<string, unknown>,
  stages: { id: string; slug: string; sort_order: number }[],
  currentStageId: string | null | undefined,
): string | null {
  if (!currentStageId) return null
  const sorted = [...stages].sort((a, b) => a.sort_order - b.sort_order)
  const currentStage = sorted.find(s => s.id === currentStageId)
  if (!currentStage) return null
  const candidates = sorted.filter(s => s.sort_order <= currentStage.sort_order)
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (stageHasAction(record, candidates[i].slug)) return candidates[i].id
  }
  return null
}

export const FUEL_LABELS: Record<string, string> = {
  benzin: 'Benzin',
  dizel: 'Dizel',
  hybrid: 'Hybrid',
  elektrik: 'Elektrik',
  lpg: 'LPG',
  diger: 'Diğer',
}

export const TRANSMISSION_LABELS: Record<string, string> = {
  manuel: 'Manuel',
  otomatik: 'Otomatik',
  yari_otomatik: 'Yarı Otomatik',
}
