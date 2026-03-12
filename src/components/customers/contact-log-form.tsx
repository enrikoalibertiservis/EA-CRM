'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { OUTCOME_LABELS, OUTCOME_COLORS } from '@/lib/utils'
import type { ContactChannel, ContactLog } from '@/lib/types/database'

interface ContactLogFormProps {
  customerId: string
  currentUserId: string
  channels: ContactChannel[]
  onLogAdded: (log: ContactLog) => void
}

export function ContactLogForm({ customerId, currentUserId, channels, onLogAdded }: ContactLogFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    channel_id: '',
    contact_date: new Date().toISOString().slice(0, 16),
    duration_minutes: '',
    note: '',
    outcome: '',
    next_action: '',
    next_action_date: '',
  })

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.channel_id) { toast.error('Kanal seçimi zorunludur'); return }

    setLoading(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('contact_logs')
        .insert({
          customer_id: customerId,
          channel_id: form.channel_id,
          contact_date: form.contact_date,
          duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
          note: form.note || null,
          outcome: form.outcome || null,
          next_action: form.next_action || null,
          next_action_date: form.next_action_date || null,
          created_by: currentUserId,
        })
        .select(`
          *,
          channel:contact_channels(*),
          created_by_profile:user_profiles(id, full_name)
        `)
        .single()

      if (error) throw error

      toast.success('İletişim kaydı eklendi')
      onLogAdded(data)
      setOpen(false)
      setForm({
        channel_id: '',
        contact_date: new Date().toISOString().slice(0, 16),
        duration_minutes: '',
        note: '',
        outcome: '',
        next_action: '',
        next_action_date: '',
      })
    } catch (err) {
      console.error(err)
      toast.error('Kayıt eklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-4 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors w-full justify-center"
      >
        <Plus className="h-4 w-4" />
        İletişim Kaydı Ekle
      </button>
    )
  }

  return (
    <div className="border border-blue-200 rounded-xl bg-blue-50/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Yeni İletişim Kaydı</h4>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Channel selection */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1.5">Temas Kanalı <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-1.5">
            {channels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => update('channel_id', ch.id)}
                className="h-7 px-2.5 rounded-full border text-xs font-medium transition-all"
                style={
                  form.channel_id === ch.id
                    ? { backgroundColor: ch.color, borderColor: ch.color, color: '#fff' }
                    : { backgroundColor: '#fff', borderColor: '#E5E7EB', color: '#374151' }
                }
              >
                {ch.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Tarih & Saat</label>
            <input
              type="datetime-local"
              value={form.contact_date}
              onChange={(e) => update('contact_date', e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Süre (dk)</label>
            <input
              type="number"
              value={form.duration_minutes}
              onChange={(e) => update('duration_minutes', e.target.value)}
              placeholder="Ör: 15"
              min="1"
              className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Outcome */}
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1.5">Görüşme Sonucu</label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(OUTCOME_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => update('outcome', form.outcome === key ? '' : key)}
                className="h-7 px-2.5 rounded-full border text-xs font-medium transition-all"
                style={
                  form.outcome === key
                    ? { backgroundColor: OUTCOME_COLORS[key], borderColor: OUTCOME_COLORS[key], color: '#fff' }
                    : { backgroundColor: '#fff', borderColor: '#E5E7EB', color: '#374151' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Görüşme Notu</label>
          <textarea
            value={form.note}
            onChange={(e) => update('note', e.target.value)}
            placeholder="Görüşmede neler konuşuldu?"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Sonraki Aksiyon</label>
            <input
              type="text"
              value={form.next_action}
              onChange={(e) => update('next_action', e.target.value)}
              placeholder="Yapılacak iş"
              className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Aksiyon Tarihi</label>
            <input
              type="date"
              value={form.next_action_date}
              onChange={(e) => update('next_action_date', e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={() => setOpen(false)} className="h-8 px-3 rounded-lg border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-50">
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="h-8 px-4 rounded-lg bg-[#1E3A5F] text-white text-xs font-medium hover:bg-[#162d4a] disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading && <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
            Kaydet
          </button>
        </div>
      </form>
    </div>
  )
}
