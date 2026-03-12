'use client'

import { useState } from 'react'
import { PipelineTimeline } from './pipeline-timeline'
import { ContactLogForm } from './contact-log-form'
import { Phone, Mail, MapPin, Car, MessageSquare, Calendar, Clock, ChevronRight, Edit2, CheckCircle, XCircle } from 'lucide-react'
import { formatDate, OUTCOME_LABELS, OUTCOME_COLORS } from '@/lib/utils'
import type { Customer, SalesStage, CustomerStageHistory, ContactLog, ContactChannel, VehicleInterest } from '@/lib/types/database'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface CustomerDetailProps {
  customer: Customer
  stages: SalesStage[]
  history: CustomerStageHistory[]
  contactLogs: ContactLog[]
  vehicleInterests: VehicleInterest[]
  channels: ContactChannel[]
  currentUserId: string
}

export function CustomerDetail({
  customer,
  stages,
  history: initialHistory,
  contactLogs: initialLogs,
  vehicleInterests,
  channels,
  currentUserId,
}: CustomerDetailProps) {
  const [currentStageId, setCurrentStageId] = useState(customer.current_stage_id)
  const [history, setHistory] = useState(initialHistory)
  const [logs, setLogs] = useState(initialLogs)
  const [activeTab, setActiveTab] = useState<'timeline' | 'contacts' | 'vehicles'>('timeline')

  const handleStageUpdate = (stageId: string) => {
    setCurrentStageId(stageId)
    // Optimistically add to history - will refresh on next server render
  }

  const handleLogAdded = (log: ContactLog) => {
    setLogs((prev) => [log, ...prev])
  }

  const currentStage = stages.find((s) => s.id === currentStageId)

  const handleMarkWon = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from('customers')
      .update({ is_won: true, is_lost: false })
      .eq('id', customer.id)
    if (error) toast.error('Güncelleme başarısız'); else toast.success('Müşteri "Kazanıldı" olarak işaretlendi')
  }

  const handleMarkLost = async () => {
    const reason = window.prompt('Kayıp nedeni (isteğe bağlı):')
    const supabase = createClient()
    const { error } = await supabase
      .from('customers')
      .update({ is_lost: true, is_won: false, lost_reason: reason || null })
      .eq('id', customer.id)
    if (error) toast.error('Güncelleme başarısız'); else toast.success('Müşteri "Kaybedildi" olarak işaretlendi')
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
              {customer.is_won && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3" /> Kazanıldı
                </span>
              )}
              {customer.is_lost && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                  <XCircle className="h-3 w-3" /> Kaybedildi
                </span>
              )}
              {/* Actions */}
              {!customer.is_won && !customer.is_lost && (
                <div className="flex gap-1.5">
                  <button
                    onClick={handleMarkWon}
                    className="h-7 px-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors flex items-center gap-1"
                  >
                    <CheckCircle className="h-3 w-3" /> Kazanıldı
                  </button>
                  <button
                    onClick={handleMarkLost}
                    className="h-7 px-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1"
                  >
                    <XCircle className="h-3 w-3" /> Kaybedildi
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Danışman</p>
              <p className="text-sm font-medium text-gray-900">{customer.consultant?.full_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Kaynak Kanal</p>
              <p className="text-sm font-medium text-gray-900">{customer.source_channel?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">İlgilendiği Model</p>
              <p className="text-sm font-medium text-gray-900">{customer.interested_model ?? '—'}</p>
            </div>
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
            { key: 'vehicles', label: `Araç İlgisi (${vehicleInterests.length})`, icon: Car },
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
            <PipelineTimeline
              customerId={customer.id}
              stages={stages}
              history={history}
              currentStageId={currentStageId}
              onStageUpdate={handleStageUpdate}
            />
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

          {/* Vehicle Interests Tab */}
          {activeTab === 'vehicles' && (
            <div className="space-y-3">
              {vehicleInterests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Car className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Henüz araç ilgisi kaydı yok</p>
                </div>
              ) : (
                vehicleInterests.map((vi) => (
                  <div key={vi.id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {vi.brand?.name} {vi.model} {vi.year && `(${vi.year})`}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {vi.color && <span className="text-xs text-gray-500">Renk: {vi.color}</span>}
                          {vi.fuel_type && <span className="text-xs text-gray-500">Yakıt: {vi.fuel_type}</span>}
                          {vi.transmission && <span className="text-xs text-gray-500">{vi.transmission}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        {vi.offered_price && (
                          <p className="text-sm font-bold text-gray-900">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(vi.offered_price)}
                          </p>
                        )}
                        {(vi.budget_min || vi.budget_max) && (
                          <p className="text-xs text-gray-500">
                            Bütçe: {vi.budget_min ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(vi.budget_min) : '—'}
                            {' — '}
                            {vi.budget_max ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(vi.budget_max) : '—'} ₺
                          </p>
                        )}
                      </div>
                    </div>
                    {vi.notes && <p className="text-xs text-gray-500 mt-2 border-t border-gray-50 pt-2">{vi.notes}</p>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
