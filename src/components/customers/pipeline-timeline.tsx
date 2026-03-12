'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Car, FileText, Clock, CheckCircle, Shield, Lock, Check, Plus } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { SalesStage, CustomerStageHistory } from '@/lib/types/database'

const stageIcons: Record<string, React.ElementType> = {
  'arac-tanitimi': Car,
  'teklif': FileText,
  'dusunme': Clock,
  'kabul': CheckCircle,
  'sigorta': Shield,
  'oto-koruma': Lock,
}

interface PipelineTimelineProps {
  customerId: string
  stages: SalesStage[]
  history: CustomerStageHistory[]
  currentStageId: string | null
  onStageUpdate: (stageId: string) => void
}

export function PipelineTimeline({ customerId, stages, history, currentStageId, onStageUpdate }: PipelineTimelineProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [noteModal, setNoteModal] = useState<{ stageId: string; stageName: string } | null>(null)
  const [note, setNote] = useState('')

  const sortedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order)
  const currentStageOrder = sortedStages.find((s) => s.id === currentStageId)?.sort_order ?? 0

  const isCompleted = (stage: SalesStage) => stage.sort_order < currentStageOrder
  const isCurrent = (stage: SalesStage) => stage.id === currentStageId
  const isNext = (stage: SalesStage) => stage.sort_order === currentStageOrder + 1

  const handleAdvance = async (stage: SalesStage) => {
    if (!isNext(stage)) return
    setNoteModal({ stageId: stage.id, stageName: stage.name })
  }

  const confirmAdvance = async () => {
    if (!noteModal) return
    setLoading(noteModal.stageId)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Update customer's current stage
      const { error: updateError } = await supabase
        .from('customers')
        .update({ current_stage_id: noteModal.stageId })
        .eq('id', customerId)

      if (updateError) throw updateError

      // Insert into history (immutable)
      const { error: histError } = await supabase
        .from('customer_stage_history')
        .insert({
          customer_id: customerId,
          stage_id: noteModal.stageId,
          note: note.trim() || null,
          entered_by: user!.id,
        })

      if (histError) throw histError

      toast.success(`"${noteModal.stageName}" aşamasına geçildi`)
      onStageUpdate(noteModal.stageId)
      setNoteModal(null)
      setNote('')
    } catch (err) {
      console.error(err)
      toast.error('Aşama güncellenirken hata oluştu')
    } finally {
      setLoading(null)
    }
  }

  const getStageHistory = (stageId: string) =>
    history.filter((h) => h.stage_id === stageId).sort((a, b) =>
      new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime()
    )

  return (
    <div>
      {/* Pipeline Steps */}
      <div className="relative">
        {/* Connection line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 z-0" style={{ left: '20px', right: '20px' }} />
        <div
          className="absolute top-5 h-0.5 bg-green-400 z-0 transition-all duration-700"
          style={{
            left: '20px',
            width: currentStageOrder > 0
              ? `${Math.min(((currentStageOrder - 1) / (sortedStages.length - 1)) * (100), 100)}%`
              : '0%',
          }}
        />

        <div className="flex items-start justify-between relative z-10 overflow-x-auto pb-2">
          {sortedStages.map((stage) => {
            const Icon = stageIcons[stage.slug] ?? Car
            const completed = isCompleted(stage)
            const current = isCurrent(stage)
            const next = isNext(stage)
            const stageHist = getStageHistory(stage.id)

            return (
              <div key={stage.id} className="flex flex-col items-center gap-2 min-w-[80px] flex-1">
                <button
                  onClick={() => next && handleAdvance(stage)}
                  disabled={!next || !!loading}
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center transition-all border-2',
                    completed && 'bg-green-500 border-green-500 text-white shadow-sm',
                    current && 'text-white shadow-lg scale-110 border-opacity-0',
                    next && 'bg-white border-dashed text-gray-400 hover:scale-105 hover:shadow cursor-pointer',
                    !completed && !current && !next && 'bg-white border-gray-200 text-gray-300',
                    loading === stage.id && 'opacity-50'
                  )}
                  style={current ? { backgroundColor: stage.color, borderColor: stage.color } : {}}
                  title={next ? `${stage.name} aşamasına ilerle` : undefined}
                >
                  {completed ? (
                    <Check className="h-4 w-4" />
                  ) : next ? (
                    <Plus className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </button>
                <div className="text-center">
                  <p
                    className={cn(
                      'text-xs font-medium leading-tight',
                      current ? 'font-semibold' : completed ? 'text-green-700' : 'text-gray-400'
                    )}
                    style={current ? { color: stage.color } : {}}
                  >
                    {stage.name}
                  </p>
                  {stageHist.length > 0 && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatDate(stageHist[0].entered_at)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stage advance note modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Aşama İlerlet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Müşteri <span className="font-medium text-gray-900">&quot;{noteModal.stageName}&quot;</span> aşamasına geçiriliyor.
            </p>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Not (isteğe bağlı)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Bu aşamaya dair notunuzu ekleyin..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setNoteModal(null); setNote('') }}
                className="h-8 px-4 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={confirmAdvance}
                disabled={!!loading}
                className="h-8 px-4 rounded-lg bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#162d4a] disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading && <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                İlerlet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage History */}
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
