'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Gauge, ReceiptText, Lightbulb, BadgeCheck, ShieldCheck, Sparkles,
  Check, Plus, X,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { SalesStage, CustomerStageHistory } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldValue = boolean | string | number | null
type FieldType = 'checkbox' | 'text' | 'currency' | 'datetime'

interface StageOption {
  field: string
  label: string
  type: FieldType
  green?: boolean
  placeholder?: string
  negativeField?: string
  negativeLabel?: string
  reasonField?: string
  reasonPlaceholder?: string
}

// ─── Stage icons ──────────────────────────────────────────────────────────────

const stageIcons: Record<string, React.ElementType> = {
  'arac-tanitimi': Gauge,
  'teklif':        ReceiptText,
  'dusunme':       Lightbulb,
  'kabul':         BadgeCheck,
  'sigorta':       ShieldCheck,
  'oto-koruma':    Sparkles,
}

// ─── Stage options config ─────────────────────────────────────────────────────

const STAGE_OPTIONS: Record<string, StageOption[]> = {
  'arac-tanitimi': [
    { field: 'vehicle_info_given', label: 'Araç Hakkında Bilgilendirme Yapıldı', type: 'checkbox' },
    { field: 'test_drive_done',    label: 'Test Sürüşü Yapıldı', type: 'checkbox' },
    { field: 'catalog_given',      label: 'Katalog / Broşür Verildi', type: 'checkbox' },
  ],
  'teklif': [
    { field: 'offer_written',  label: 'Yazılı Teklif Verildi', type: 'checkbox' },
    { field: 'offer_amount',   label: 'Teklif Tutarı', type: 'currency', placeholder: '0,00' },
    { field: 'offer_campaign', label: 'Kampanya', type: 'text', placeholder: 'Kampanya adı (varsa)' },
  ],
  'dusunme': [
    { field: 'followup_done',     label: 'Takip Araması Yapıldı', type: 'checkbox' },
    { field: 'followup_datetime', label: 'Arama Tarihi / Saati', type: 'datetime' },
  ],
  'kabul': [
    { field: 'offer_accepted',   label: 'Müşteri Teklifi Kabul Etti', type: 'checkbox', green: true },
    { field: 'deposit_received', label: 'Kaparo / Ön Ödeme Alındı',  type: 'checkbox', green: true },
    { field: 'contract_signed',  label: 'Sözleşme İmzalandı',         type: 'checkbox', green: true },
  ],
  'sigorta': [
    {
      field: 'insurance_kasko_offered', label: 'Kasko Sigortası', type: 'checkbox', green: true,
      negativeField: 'insurance_kasko_not_done', negativeLabel: 'Yapılamadı',
      reasonField: 'insurance_kasko_fail_reason', reasonPlaceholder: 'Neden yapılamadı?',
    },
    {
      field: 'insurance_trafik_offered', label: 'Trafik Sigortası', type: 'checkbox', green: true,
      negativeField: 'insurance_trafik_not_done', negativeLabel: 'Yapılamadı',
      reasonField: 'insurance_trafik_fail_reason', reasonPlaceholder: 'Neden yapılamadı?',
    },
  ],
  'oto-koruma': [
    {
      field: 'oto_koruma_sold', label: 'Oto Koruma Satışı', type: 'checkbox', green: true,
      negativeField: 'oto_koruma_not_done', negativeLabel: 'Yapılamadı',
      reasonField: 'oto_koruma_fail_reason', reasonPlaceholder: 'Neden yapılamadı?',
    },
    { field: 'oto_koruma_product', label: 'Uygulama Adı', type: 'text',     placeholder: 'Ürün / uygulama adı' },
    { field: 'oto_koruma_amount',  label: 'Tutar',         type: 'currency', placeholder: '0,00' },
  ],
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PipelineTimelineProps {
  customerId: string
  stages: SalesStage[]
  history: CustomerStageHistory[]
  currentStageId: string | null
  onStageUpdate: (stageId: string) => void
  customerFields: Record<string, FieldValue>
  onUpdateField: (field: string, value: FieldValue) => Promise<void>
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PipelineTimeline({
  customerId, stages, history, currentStageId, onStageUpdate, customerFields, onUpdateField,
}: PipelineTimelineProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [expandedStageId, setExpandedStageId] = useState<string | null>(currentStageId)

  const sortedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order)
  const currentStageOrder = sortedStages.find((s) => s.id === currentStageId)?.sort_order ?? 0

  const isCompleted = (stage: SalesStage) => stage.sort_order < currentStageOrder
  const isCurrent  = (stage: SalesStage) => stage.id === currentStageId
  const isNext     = (stage: SalesStage) => stage.sort_order === currentStageOrder + 1

  const handleStageClick = async (stage: SalesStage) => {
    if (isNext(stage)) {
      setLoading(stage.id)
      const supabase = createClient()
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { error: updateError } = await supabase
          .from('customers').update({ current_stage_id: stage.id }).eq('id', customerId)
        if (updateError) throw updateError
        await supabase.from('customer_stage_history')
          .insert({ customer_id: customerId, stage_id: stage.id, note: null, entered_by: user!.id })
        toast.success(`"${stage.name}" aşamasına geçildi`)
        onStageUpdate(stage.id)
        setExpandedStageId(stage.id)
      } catch (err) {
        console.error(err)
        toast.error('Aşama güncellenirken hata oluştu')
      } finally {
        setLoading(null)
      }
    } else if (isCompleted(stage) || isCurrent(stage)) {
      setExpandedStageId(prev => prev === stage.id ? null : stage.id)
    }
  }

  const handlePairedClick = async (opt: StageOption, clickedPositive: boolean) => {
    if (!opt.negativeField) return
    const isPositive = !!customerFields[opt.field]
    const isNegative = !!customerFields[opt.negativeField]

    if (clickedPositive) {
      if (isPositive) { await onUpdateField(opt.field, false) }
      else { await onUpdateField(opt.field, true); if (isNegative) await onUpdateField(opt.negativeField, false) }
    } else {
      if (isNegative) { await onUpdateField(opt.negativeField, false) }
      else { await onUpdateField(opt.negativeField, true); if (isPositive) await onUpdateField(opt.field, false) }
    }
  }

  const getStageHistory = (stageId: string) =>
    history.filter((h) => h.stage_id === stageId)
      .sort((a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime())

  const expandedStage   = expandedStageId ? sortedStages.find(s => s.id === expandedStageId) : null
  const expandedOptions = expandedStage ? (STAGE_OPTIONS[expandedStage.slug] ?? []) : []
  const expandedHistory = expandedStageId ? getStageHistory(expandedStageId) : []

  const getCheckboxProgress = (slug: string) => {
    const opts = STAGE_OPTIONS[slug] ?? []
    const checkOpts = opts.filter(o => o.type === 'checkbox')
    const done = checkOpts.filter(o =>
      o.negativeField
        ? !!customerFields[o.field] || !!customerFields[o.negativeField]
        : !!customerFields[o.field],
    ).length
    return { done, total: checkOpts.length }
  }

  const pairedOptions      = expandedOptions.filter(o => o.type === 'checkbox' && o.negativeField)
  const simpleCheckboxOpts = expandedOptions.filter(o => o.type === 'checkbox' && !o.negativeField)
  const inputOpts          = expandedOptions.filter(o => o.type !== 'checkbox')

  return (
    <div>
      {/* ── Pipeline Steps ── */}
      <div className="relative">
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 z-0" />
        <div
          className="absolute top-5 h-0.5 bg-green-400 z-0 transition-all duration-700"
          style={{
            left: '20px',
            width: currentStageOrder > 0
              ? `${Math.min(((currentStageOrder - 1) / (sortedStages.length - 1)) * 100, 100)}%`
              : '0%',
          }}
        />
        <div className="flex items-start justify-between relative z-10 overflow-x-auto pb-2">
          {sortedStages.map((stage) => {
            const Icon       = stageIcons[stage.slug] ?? Gauge
            const completed  = isCompleted(stage)
            const current    = isCurrent(stage)
            const next       = isNext(stage)
            const isExpanded = expandedStageId === stage.id
            const clickable  = completed || current || next
            const { done, total } = getCheckboxProgress(stage.slug)

            return (
              <div key={stage.id} className="flex flex-col items-center gap-1.5 min-w-[80px] flex-1">
                <button
                  onClick={() => handleStageClick(stage)}
                  disabled={!clickable || !!loading}
                  title={
                    next ? `${stage.name} aşamasına ilerle` :
                    (completed || current) ? `${stage.name} detayları` : undefined
                  }
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center transition-all border-2',
                    completed && 'bg-green-500 border-green-500 text-white shadow-sm',
                    current && 'text-white shadow-lg scale-110',
                    next && 'bg-white border-dashed text-gray-400 hover:scale-105 hover:shadow cursor-pointer',
                    !completed && !current && !next && 'bg-white border-gray-200 text-gray-300',
                    (completed || current) && 'hover:scale-105 cursor-pointer',
                    isExpanded && 'ring-2 ring-offset-2 ring-blue-300',
                    loading === stage.id && 'opacity-50',
                  )}
                  style={current ? { backgroundColor: stage.color, borderColor: stage.color } : {}}
                >
                  {completed ? <Check className="h-4 w-4" />
                    : next ? <Plus className="h-3.5 w-3.5" />
                    : <Icon className="h-4 w-4" />}
                </button>

                <div className="text-center">
                  <p
                    className={cn(
                      'text-xs font-medium leading-tight',
                      current ? 'font-semibold' : completed ? 'text-green-700' : 'text-gray-400',
                    )}
                    style={current ? { color: stage.color } : {}}
                  >
                    {stage.name}
                  </p>
                  {getStageHistory(stage.id).length > 0 && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatDate(getStageHistory(stage.id)[0].entered_at)}
                    </p>
                  )}
                  {total > 0 && (completed || current) && (
                    <p className={cn(
                      'text-[10px] font-semibold mt-0.5',
                      done === total ? 'text-green-600' : done > 0 ? 'text-amber-500' : 'text-gray-400',
                    )}>
                      {done}/{total}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Expanded Stage Panel ── */}
      {expandedStage && (() => {
        const Icon = stageIcons[expandedStage.slug] ?? Gauge
        const c = expandedStage.color
        return (
          <div
            className="mt-4 rounded-2xl overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${c}10 0%, ${c}05 100%)`, border: `1px solid ${c}30` }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ background: `linear-gradient(135deg, ${c}20 0%, ${c}08 100%)`, borderBottom: `1px solid ${c}20` }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ background: `${c}25`, border: `1.5px solid ${c}40` }}
                >
                  <Icon className="h-4.5 w-4.5" style={{ color: c }} />
                </div>
                <div>
                  <span className="text-sm font-bold" style={{ color: c }}>{expandedStage.name}</span>
                  {expandedHistory.length > 0 && (
                    <p className="text-[10px] text-gray-400">{formatDate(expandedHistory[0].entered_at)}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setExpandedStageId(null)}
                className="h-7 w-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/60"
                style={{ color: c + 'aa' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Panel content */}
            {expandedOptions.length > 0 && (
              <div className="p-4 space-y-3">

                {/* ── Paired toggles (yapıldı / yapılamadı) ── */}
                {pairedOptions.length > 0 && (
                  <div className="space-y-2.5">
                    {pairedOptions.map((opt) => {
                      const isPositive = !!customerFields[opt.field]
                      const isNegative = !!customerFields[opt.negativeField!]
                      return (
                        <div
                          key={opt.field}
                          className="rounded-xl overflow-hidden"
                          style={{ border: `1px solid ${c}20`, background: 'rgba(255,255,255,0.55)' }}
                        >
                          {/* Option label */}
                          <div
                            className="px-3 py-1.5 text-xs font-semibold tracking-wide"
                            style={{ color: c, background: `${c}12` }}
                          >
                            {opt.label}
                          </div>
                          {/* Toggle buttons */}
                          <div className="flex gap-2 p-2">
                            <button
                              onClick={() => handlePairedClick(opt, true)}
                              className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all border',
                                isPositive
                                  ? 'bg-green-500/15 border-green-400/50 text-green-700 shadow-sm'
                                  : 'bg-white/70 border-gray-200/80 text-gray-500 hover:bg-green-500/10 hover:border-green-300/70 hover:text-green-600',
                              )}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Yapıldı
                              {isPositive && <span className="ml-0.5 text-green-500">✓</span>}
                            </button>
                            <button
                              onClick={() => handlePairedClick(opt, false)}
                              className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all border',
                                isNegative
                                  ? 'bg-red-500/15 border-red-400/50 text-red-700 shadow-sm'
                                  : 'bg-white/70 border-gray-200/80 text-gray-500 hover:bg-red-500/10 hover:border-red-300/70 hover:text-red-600',
                              )}
                            >
                              <X className="h-3.5 w-3.5" />
                              {opt.negativeLabel ?? 'Yapılamadı'}
                            </button>
                          </div>
                          {/* Reason input */}
                          {isNegative && opt.reasonField && (
                            <div className="px-2 pb-2">
                              <input
                                key={`${opt.reasonField}-${customerFields[opt.reasonField]}`}
                                type="text"
                                defaultValue={customerFields[opt.reasonField] ? String(customerFields[opt.reasonField]) : ''}
                                onBlur={async (e) => {
                                  const raw = e.target.value.trim()
                                  await onUpdateField(opt.reasonField!, raw || null)
                                }}
                                placeholder={opt.reasonPlaceholder ?? 'Sebep yazın...'}
                                className="w-full h-8 rounded-lg border border-red-200/70 bg-red-50/40 px-3 text-xs text-red-800 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-300/50 transition-colors"
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Simple checkboxes ── */}
                {simpleCheckboxOpts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {simpleCheckboxOpts.map((opt) => {
                      const checked = !!customerFields[opt.field]
                      return (
                        <button
                          key={opt.field}
                          onClick={() => onUpdateField(opt.field, !checked)}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all w-full',
                            checked
                              ? opt.green
                                ? 'bg-green-500/12 border-green-400/40 shadow-sm'
                                : 'bg-blue-500/12 border-blue-400/40 shadow-sm'
                              : 'bg-white/60 border-gray-200/70 hover:bg-white/90 hover:border-gray-300/80',
                          )}
                          style={checked ? { background: checked ? (opt.green ? `${c}15` : undefined) : undefined } : {}}
                        >
                          <div
                            className={cn(
                              'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                              checked
                                ? opt.green ? 'bg-green-500 border-green-500 shadow-sm' : 'bg-blue-500 border-blue-500 shadow-sm'
                                : 'border-gray-300 bg-white/80',
                            )}
                          >
                            {checked && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <span className={cn(
                            'text-sm flex-1',
                            checked
                              ? opt.green ? 'text-green-800 font-semibold' : 'text-blue-800 font-semibold'
                              : 'text-gray-600',
                          )}>
                            {opt.label}
                          </span>
                          {checked && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: `${c}20`, color: c }}
                            >✓</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* ── Text / Currency / Datetime inputs ── */}
                {inputOpts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {inputOpts.map((opt) => {
                      const currentVal = customerFields[opt.field]
                      const displayVal = opt.type === 'currency' && currentVal != null && currentVal !== ''
                        ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(currentVal))
                        : currentVal != null ? String(currentVal) : ''
                      return (
                        <div key={opt.field}>
                          <label
                            className="text-xs font-semibold block mb-1.5 tracking-wide"
                            style={{ color: c + 'cc' }}
                          >
                            {opt.label}
                          </label>
                          <div className="relative">
                            {opt.type === 'currency' && (
                              <span
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold"
                                style={{ color: c + '99' }}
                              >₺</span>
                            )}
                            <input
                              key={`${opt.field}-${currentVal}`}
                              type={opt.type === 'datetime' ? 'datetime-local' : 'text'}
                              defaultValue={displayVal}
                              onBlur={async (e) => {
                                const raw = e.target.value.trim()
                                if (opt.type === 'currency') {
                                  if (!raw) { await onUpdateField(opt.field, null); return }
                                  const normalized = raw.replace(/\./g, '').replace(',', '.')
                                  const n = parseFloat(normalized)
                                  await onUpdateField(opt.field, isNaN(n) ? null : n)
                                } else {
                                  await onUpdateField(opt.field, raw || null)
                                }
                              }}
                              placeholder={opt.placeholder}
                              className={cn(
                                'w-full h-9 rounded-xl border text-sm bg-white/60 focus:bg-white/90 focus:outline-none transition-all backdrop-blur-sm',
                                opt.type === 'currency' ? 'pl-7 pr-3' : 'px-3',
                              )}
                              style={{
                                borderColor: `${c}30`,
                                boxShadow: `inset 0 1px 3px ${c}08`,
                              }}
                              onFocus={e => { e.target.style.borderColor = `${c}60`; e.target.style.boxShadow = `0 0 0 3px ${c}15` }}
                              onBlurCapture={e => { e.currentTarget.style.borderColor = `${c}30`; e.currentTarget.style.boxShadow = `inset 0 1px 3px ${c}08` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Stage note ── */}
            <StageNoteField
              stageId={expandedStage.id}
              customerId={customerId}
              existingNote={expandedHistory[0]?.note ?? null}
              enteredBy={expandedHistory[0]?.entered_by_profile?.full_name ?? null}
              color={c}
            />
          </div>
        )
      })()}

      {/* Hint */}
      {!expandedStage && (
        <p className="text-[11px] text-gray-400 text-center mt-3">
          Aktif veya tamamlanan aşamalara tıklayarak detayları görün ve güncelleyin
        </p>
      )}

      {/* ── Stage History ── */}
      {history.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Aşama Geçmişi</h4>
          <div className="space-y-2">
            {[...history]
              .sort((a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime())
              .map((h) => (
                <div key={h.id} className="flex items-start gap-3 py-2">
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: (h.stage?.color ?? '#6B7280') + '22' }}
                  >
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: h.stage?.color ?? '#6B7280' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-900">{h.stage?.name ?? '—'}</span>
                      <span className="text-xs text-gray-400">{formatDate(h.entered_at, { time: true })}</span>
                    </div>
                    {h.note && <p className="text-xs text-gray-600 mt-0.5">{h.note}</p>}
                    <p className="text-[10px] text-gray-400">{h.entered_by_profile?.full_name ?? 'Sistem'}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stage Note Field ─────────────────────────────────────────────────────────

function StageNoteField({
  stageId, customerId, existingNote, enteredBy, color,
}: {
  stageId: string
  customerId: string
  existingNote: string | null
  enteredBy: string | null
  color: string
}) {
  const [note, setNote] = useState(existingNote ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const trimmed = note.trim()
    if (trimmed === (existingNote ?? '')) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('customer_stage_history')
      .update({ note: trimmed || null })
      .eq('customer_id', customerId)
      .eq('stage_id', stageId)
      .order('entered_at', { ascending: false })
      .limit(1)
    setSaving(false)
    toast.success('Not kaydedildi')
  }

  return (
    <div
      className="mx-4 mb-4 rounded-xl p-3"
      style={{ background: `${color}08`, border: `1px solid ${color}20` }}
    >
      <label
        className="text-xs font-semibold block mb-1.5 tracking-wide"
        style={{ color: color + 'bb' }}
      >
        Aşama Notu
        {enteredBy && <span className="font-normal ml-1 opacity-70">— {enteredBy}</span>}
      </label>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={handleSave}
        placeholder="Bu aşamaya ait not veya açıklama ekleyin..."
        rows={2}
        className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none resize-none transition-all bg-white/60 backdrop-blur-sm placeholder:text-gray-300"
        style={{ borderColor: `${color}30` }}
        onFocus={e => { e.target.style.borderColor = `${color}60`; e.target.style.boxShadow = `0 0 0 3px ${color}12` }}
        onBlurCapture={e => { e.currentTarget.style.borderColor = `${color}30`; e.currentTarget.style.boxShadow = 'none' }}
      />
      {saving && <p className="text-[10px] mt-0.5 opacity-50" style={{ color }}>Kaydediliyor...</p>}
    </div>
  )
}
