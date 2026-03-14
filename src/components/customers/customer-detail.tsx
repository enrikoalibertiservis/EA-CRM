'use client'

import { useState, useEffect } from 'react'
import { PipelineTimeline } from './pipeline-timeline'
import { ContactLogForm } from './contact-log-form'
import { Phone, Mail, MapPin, MessageSquare, Calendar, Clock, ChevronRight, CheckCircle, XCircle, X, AlertCircle, Pencil, Check } from 'lucide-react'
import { formatDate, OUTCOME_LABELS, OUTCOME_COLORS } from '@/lib/utils'
import type { Customer, SalesStage, CustomerStageHistory, ContactLog, ContactChannel, Brand } from '@/lib/types/database'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface CustomerDetailProps {
  customer: Customer
  stages: SalesStage[]
  history: CustomerStageHistory[]
  contactLogs: ContactLog[]
  channels: ContactChannel[]
  currentUserId: string
  isAdmin?: boolean
  brandOptions?: Pick<Brand, 'id' | 'name' | 'color'>[]
  consultantOptions?: { id: string; full_name: string }[]
}

export function CustomerDetail({
  customer,
  stages,
  history: initialHistory,
  contactLogs: initialLogs,
  channels,
  currentUserId,
  isAdmin = false,
  brandOptions = [],
  consultantOptions = [],
}: CustomerDetailProps) {
  const [currentStageId, setCurrentStageId] = useState(customer.current_stage_id)
  const [history, setHistory] = useState(initialHistory)
  const [logs, setLogs] = useState(initialLogs)
  const [activeTab, setActiveTab] = useState<'timeline' | 'contacts'>('timeline')

  // Editable customer meta fields
  const [editingField, setEditingField] = useState<string | null>(null)
  const [consultantId, setConsultantId] = useState(customer.consultant_id)
  const [brandId, setBrandId] = useState(customer.brand_id)
  const [sourceChannelId, setSourceChannelId] = useState(customer.source_channel_id)
  const [interestedModel, setInterestedModel] = useState(customer.interested_model ?? '')
  const [savingField, setSavingField] = useState<string | null>(null)

  const currentBrand = brandOptions.find(b => b.id === brandId) ?? customer.brand
  const currentConsultant = consultantOptions.find(c => c.id === consultantId) ?? customer.consultant
  const currentChannel = channels.find(c => c.id === sourceChannelId) ?? customer.source_channel

  const saveMetaField = async (field: string, value: string | null) => {
    setSavingField(field)
    const supabase = createClient()
    const { error } = await supabase.from('customers').update({ [field]: value }).eq('id', customer.id)
    setSavingField(null)
    if (error) { toast.error('Güncellenemedi'); return false }
    toast.success('Güncellendi')
    setEditingField(null)
    return true
  }

  const [isWon, setIsWon] = useState(customer.is_won)
  const [isLost, setIsLost] = useState(customer.is_lost)
  const [showLostModal, setShowLostModal] = useState(false)

  const [stageFields, setStageFields] = useState<Record<string, boolean | string | number | null>>({
    vehicle_info_given:              customer.vehicle_info_given ?? false,
    test_drive_done:                 customer.test_drive_done ?? false,
    catalog_given:                   customer.catalog_given ?? false,
    offer_written:                   customer.offer_written ?? false,
    offer_amount:                    customer.offer_amount ?? null,
    offer_campaign:                  customer.offer_campaign ?? null,
    offer_accepted:                  customer.offer_accepted ?? false,
    followup_done:                   customer.followup_done ?? false,
    followup_datetime:               customer.followup_datetime ?? null,
    deposit_received:                customer.deposit_received ?? false,
    contract_signed:                 customer.contract_signed ?? false,
    insurance_kasko_offered:         customer.insurance_kasko_offered ?? false,
    insurance_kasko_not_done:        customer.insurance_kasko_not_done ?? false,
    insurance_kasko_fail_reason:     customer.insurance_kasko_fail_reason ?? null,
    insurance_trafik_offered:        customer.insurance_trafik_offered ?? false,
    insurance_trafik_not_done:       customer.insurance_trafik_not_done ?? false,
    insurance_trafik_fail_reason:    customer.insurance_trafik_fail_reason ?? null,
    oto_koruma_sold:                 customer.oto_koruma_sold ?? false,
    oto_koruma_not_done:             customer.oto_koruma_not_done ?? false,
    oto_koruma_fail_reason:          customer.oto_koruma_fail_reason ?? null,
    oto_koruma_product:              customer.oto_koruma_product ?? null,
    oto_koruma_amount:               customer.oto_koruma_amount ?? null,
    verbal_agreement_done:           customer.verbal_agreement_done ?? false,
    sale_completed:                  customer.sale_completed ?? false,
  })

  const handleStageUpdate = (stageId: string) => {
    setCurrentStageId(stageId)
    // Optimistically add to history - will refresh on next server render
  }

  const handleLogAdded = (log: ContactLog) => {
    setLogs((prev) => [log, ...prev])
  }

  const currentStage = stages.find((s) => s.id === currentStageId)

  const handleToggleWon = async () => {
    const next = !isWon
    setIsWon(next)
    if (next) setIsLost(false)
    const supabase = createClient()
    const { error } = await supabase
      .from('customers')
      .update({ is_won: next, ...(next ? { is_lost: false } : {}) })
      .eq('id', customer.id)
    if (error) { toast.error('Güncelleme başarısız'); setIsWon(!next) }
    else toast.success(next ? 'Satış yapıldı olarak işaretlendi' : 'Satış durumu kaldırıldı')
  }

  const handleMarkLost = () => {
    if (isLost) {
      handleUndoLost()
    } else {
      setShowLostModal(true)
    }
  }

  const handleUndoLost = async () => {
    setIsLost(false)
    const supabase = createClient()
    const { error } = await supabase
      .from('customers')
      .update({ is_lost: false, lost_reason: null })
      .eq('id', customer.id)
    if (error) { toast.error('Güncelleme başarısız'); setIsLost(true) }
    else toast.success('Kayıp durumu kaldırıldı')
  }

  const handleConfirmLost = async (reasons: string[], note: string) => {
    const lostReason = [...reasons, ...(note.trim() ? [`Not: ${note.trim()}`] : [])].join('\n')
    setIsLost(true)
    setIsWon(false)
    setShowLostModal(false)
    const supabase = createClient()
    const { error } = await supabase
      .from('customers')
      .update({ is_lost: true, is_won: false, lost_reason: lostReason || null })
      .eq('id', customer.id)
    if (error) { toast.error('Güncelleme başarısız'); setIsLost(false) }
    else toast.success('Müşteri "Satış Yapılamadı" olarak işaretlendi')
  }

  const onUpdateField = async (field: string, value: boolean | string | number | null) => {
    const prev = stageFields[field]
    setStageFields(p => ({ ...p, [field]: value }))
    const supabase = createClient()
    const { error } = await supabase.from('customers').update({ [field]: value }).eq('id', customer.id)
    if (error) { toast.error('Güncellenemedi'); setStageFields(p => ({ ...p, [field]: prev })) }
  }

  return (
    <div className="space-y-5">
      {/* Customer Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Top color bar */}
        <div className="h-1.5" style={{ backgroundColor: customer.brand?.color ?? '#6B7280' }} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                style={{ backgroundColor: customer.brand?.color ?? '#6B7280' }}
              >
                {customer.full_name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{customer.full_name}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      {customer.email}
                    </div>
                  )}
                  {customer.city && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {customer.city}{customer.district && `, ${customer.district}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status badges */}
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: (customer.brand?.color ?? '#6B7280') + '22',
                  color: customer.brand?.color ?? '#6B7280',
                }}
              >
                {customer.brand?.name ?? '—'}
              </span>
              {currentStage && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: currentStage.color + '22',
                    color: currentStage.color,
                  }}
                >
                  {currentStage.name}
                </span>
              )}
              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Kaçan Satış */}
                {!isWon && (
                  <button
                    onClick={handleMarkLost}
                    title={isLost ? 'Kayıp durumunu kaldırmak için tıklayın' : ''}
                    className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border-2 transition-all ${
                      isLost
                        ? 'bg-red-600 border-red-600 text-white shadow-sm hover:bg-red-700'
                        : 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100 hover:border-red-400'
                    }`}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {isLost ? 'Kaçan Satış ✕' : 'Kaçan Satış'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-gray-100">

            {/* Marka */}
            <div className="group">
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-xs text-gray-400">Marka</p>
                {isAdmin && editingField !== 'brand_id' && (
                  <button onClick={() => setEditingField('brand_id')} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                  </button>
                )}
              </div>
              {isAdmin && editingField === 'brand_id' ? (
                <div className="flex items-center gap-1">
                  <select
                    autoFocus
                    value={brandId ?? ''}
                    onChange={e => setBrandId(e.target.value)}
                    className="flex-1 h-7 rounded-lg border border-blue-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {brandOptions.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={async () => { if (await saveMetaField('brand_id', brandId)) setBrandId(brandId) }}
                    disabled={savingField === 'brand_id'}
                    className="h-7 w-7 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50"
                  >
                    {savingField === 'brand_id' ? <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => { setBrandId(customer.brand_id); setEditingField(null) }} className="h-7 w-7 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-900">{currentBrand?.name ?? '—'}</p>
              )}
            </div>

            {/* Danışman */}
            <div className="group">
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-xs text-gray-400">Danışman</p>
                {isAdmin && editingField !== 'consultant_id' && (
                  <button onClick={() => setEditingField('consultant_id')} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                  </button>
                )}
              </div>
              {isAdmin && editingField === 'consultant_id' ? (
                <div className="flex items-center gap-1">
                  <select
                    autoFocus
                    value={consultantId ?? ''}
                    onChange={e => setConsultantId(e.target.value)}
                    className="flex-1 h-7 rounded-lg border border-blue-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">— Seçiniz —</option>
                    {consultantOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                  <button
                    onClick={async () => { await saveMetaField('consultant_id', consultantId || null) }}
                    disabled={savingField === 'consultant_id'}
                    className="h-7 w-7 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50"
                  >
                    {savingField === 'consultant_id' ? <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => { setConsultantId(customer.consultant_id); setEditingField(null) }} className="h-7 w-7 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-900">{currentConsultant?.full_name ?? '—'}</p>
              )}
            </div>

            {/* Kaynak Kanal */}
            <div className="group">
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-xs text-gray-400">Kaynak Kanal</p>
                {isAdmin && editingField !== 'source_channel_id' && (
                  <button onClick={() => setEditingField('source_channel_id')} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                  </button>
                )}
              </div>
              {isAdmin && editingField === 'source_channel_id' ? (
                <div className="flex items-center gap-1">
                  <select
                    autoFocus
                    value={sourceChannelId ?? ''}
                    onChange={e => setSourceChannelId(e.target.value)}
                    className="flex-1 h-7 rounded-lg border border-blue-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">— Seçiniz —</option>
                    {channels.map(ch => (
                      <option key={ch.id} value={ch.id}>{ch.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={async () => { await saveMetaField('source_channel_id', sourceChannelId || null) }}
                    disabled={savingField === 'source_channel_id'}
                    className="h-7 w-7 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50"
                  >
                    {savingField === 'source_channel_id' ? <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => { setSourceChannelId(customer.source_channel_id); setEditingField(null) }} className="h-7 w-7 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-900">{currentChannel?.name ?? '—'}</p>
              )}
            </div>

            {/* İlgilendiği Model */}
            <div className="group">
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-xs text-gray-400">İlgilendiği Model</p>
                {isAdmin && editingField !== 'interested_model' && (
                  <button onClick={() => setEditingField('interested_model')} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                  </button>
                )}
              </div>
              {isAdmin && editingField === 'interested_model' ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={interestedModel}
                    onChange={e => setInterestedModel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveMetaField('interested_model', interestedModel || null); if (e.key === 'Escape') { setInterestedModel(customer.interested_model ?? ''); setEditingField(null) } }}
                    className="flex-1 h-7 rounded-lg border border-blue-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Model adı..."
                  />
                  <button
                    onClick={async () => { await saveMetaField('interested_model', interestedModel || null) }}
                    disabled={savingField === 'interested_model'}
                    className="h-7 w-7 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50"
                  >
                    {savingField === 'interested_model' ? <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => { setInterestedModel(customer.interested_model ?? ''); setEditingField(null) }} className="h-7 w-7 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-900">{interestedModel || '—'}</p>
              )}
            </div>

            {/* Kayıt Tarihi — read-only */}
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Kayıt Tarihi</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(customer.created_at)}</p>
            </div>

          </div>

          {customer.notes && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-xs text-amber-700">{customer.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {[
            { key: 'timeline', label: 'Satış Süreci', icon: ChevronRight },
            { key: 'contacts', label: `İletişim (${logs.length})`, icon: MessageSquare },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Pipeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-5">
              <PipelineTimeline
                customerId={customer.id}
                stages={stages}
                history={history}
                currentStageId={currentStageId}
                onStageUpdate={handleStageUpdate}
                customerFields={stageFields}
                onUpdateField={onUpdateField}
              />

            </div>
          )}

          {/* Contact Logs Tab */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <ContactLogForm
                customerId={customer.id}
                currentUserId={currentUserId}
                channels={channels}
                onLogAdded={handleLogAdded}
              />
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">Henüz iletişim kaydı yok</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: (log.channel?.color ?? '#6B7280') + '22' }}
                      >
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: log.channel?.color ?? '#6B7280' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-900">{log.channel?.name ?? '—'}</span>
                          <span className="text-xs text-gray-400">{formatDate(log.contact_date, { time: true })}</span>
                          {log.duration_minutes && (
                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />{log.duration_minutes} dk
                            </span>
                          )}
                          {log.outcome && (
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: OUTCOME_COLORS[log.outcome] + '22',
                                color: OUTCOME_COLORS[log.outcome],
                              }}
                            >
                              {OUTCOME_LABELS[log.outcome]}
                            </span>
                          )}
                        </div>
                        {log.note && <p className="text-xs text-gray-600 mt-1">{log.note}</p>}
                        {log.next_action && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                            <Calendar className="h-3 w-3" />
                            <span>{log.next_action}</span>
                            {log.next_action_date && <span className="text-gray-400">({formatDate(log.next_action_date)})</span>}
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">{log.created_by_profile?.full_name ?? 'Sistem'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Lost Reason Modal */}
      {showLostModal && (
        <LostReasonModal
          onConfirm={handleConfirmLost}
          onClose={() => setShowLostModal(false)}
        />
      )}
    </div>
  )
}

// ─── Lost Reason Modal ────────────────────────────────────────────────────────

function LostReasonModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (reasons: string[], note: string) => Promise<void>
  onClose: () => void
}) {
  const [reasons, setReasons] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('lost_reasons').select('name').eq('is_active', true).order('sort_order')
      .then(({ data }) => setReasons((data ?? []).map((r: { name: string }) => r.name)))
  }, [])

  const toggle = (r: string) =>
    setSelected(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])

  const handleSave = async () => {
    if (selected.length === 0 && !note.trim()) {
      toast.error('En az bir sebep seçin veya not girin')
      return
    }
    setSaving(true)
    await onConfirm(selected, note)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Satış Yapılamadı</h3>
              <p className="text-xs text-gray-500">Lütfen sebep(leri) işaretleyin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Reasons */}
        <div className="px-5 py-4 space-y-2 max-h-72 overflow-y-auto">
          {reasons.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">Sebepler yükleniyor...</p>
          )}
          {reasons.map((reason) => {
            const checked = selected.includes(reason)
            return (
              <button
                key={reason}
                onClick={() => toggle(reason)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  checked
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white'
                }`}
              >
                <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  checked ? 'bg-red-500 border-red-500' : 'bg-white border-gray-300'
                }`}>
                  {checked && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${checked ? 'text-red-800 font-medium' : 'text-gray-700'}`}>
                  {reason}
                </span>
              </button>
            )
          })}
        </div>

        {/* Additional note */}
        <div className="px-5 pb-4">
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Ek not (isteğe bağlı)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Detay veya ek bilgi..."
            rows={2}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none bg-gray-50"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-9 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            {saving
              ? <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              : <XCircle className="h-3.5 w-3.5 shrink-0" />
            }
            Onayla
          </button>
        </div>
      </div>
    </div>
  )
}

