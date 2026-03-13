'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { UserPlus, Phone, User, Car, Zap } from 'lucide-react'

interface Props {
  brands:  { id: string; name: string; color: string }[]
  models:  { id: string; brand_id: string; name: string }[]
  currentUserId:    string
  currentLocationId: string
}

function formatGSM(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 4) return d
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`
  if (d.length <= 9) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`
}

export function QuickRegister({ brands, models, currentUserId, currentLocationId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [brandId, setBrandId] = useState('')
  const [model, setModel]     = useState('')
  const [errors, setErrors]   = useState<Record<string, string>>({})

  const filteredModels = brandId ? models.filter(m => m.brand_id === brandId) : models

  const handleBrand = (id: string) => {
    setBrandId(prev => prev === id ? '' : id)
    setModel('')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim())  e.name  = 'Ad Soyad zorunludur'
    if (!phone.trim()) e.phone = 'Telefon zorunludur'
    if (!brandId)      e.brand = 'Marka seçin'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('customers').insert({
        full_name:        name.trim(),
        phone:            phone.trim(),
        brand_id:         brandId,
        interested_model: model || null,
        consultant_id:    currentUserId,
        location_id:      currentLocationId,
        created_by:       currentUserId,
      }).select().single()
      if (error) throw error
      toast.success('Müşteri kaydedildi!')
      router.push('/dashboard')
    } catch {
      toast.error('Kayıt sırasında hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-green-400 shadow-md overflow-hidden h-full flex flex-col"
      style={{ boxShadow: '0 4px 24px 0 #22c55e22' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-green-100"
        style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)' }}>
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: '0 2px 8px #22c55e55' }}>
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Hızlı Müşteri Kaydı</h3>
          <p className="text-[11px] text-green-600 font-medium">Müşteriyi bekletmeden sisteme girin</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        {/* Ad + Telefon */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Ad Soyad <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setErrors(p => { const n={...p}; delete n.name; return n }) }}
                placeholder="Müşteri adı soyadı"
                className={`w-full h-9 rounded-lg border pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
              />
            </div>
            {errors.name && <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Telefon <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(formatGSM(e.target.value)); setErrors(p => { const n={...p}; delete n.phone; return n }) }}
                placeholder="0532 456 78 90"
                maxLength={14}
                className={`w-full h-9 rounded-lg border pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
              />
            </div>
            {errors.phone && <p className="text-[11px] text-red-500 mt-0.5">{errors.phone}</p>}
          </div>
        </div>

        {/* Marka */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1.5">
            Marka <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {brands.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => { handleBrand(b.id); setErrors(p => { const n={...p}; delete n.brand; return n }) }}
                className="h-8 px-4 rounded-lg border text-xs font-semibold transition-all"
                style={brandId === b.id
                  ? { backgroundColor: b.color + 'cc', borderColor: b.color, color: '#fff' }
                  : { backgroundColor: b.color + '12', borderColor: b.color + '35', color: b.color + 'cc' }
                }
              >
                {b.name}
              </button>
            ))}
          </div>
          {errors.brand && <p className="text-[11px] text-red-500 mt-0.5">{errors.brand}</p>}
        </div>

        {/* Model */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            <Car className="inline h-3 w-3 mr-1 text-gray-400" />
            İlgilendiği Model
          </label>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Model seçin (opsiyonel)</option>
            {filteredModels.map(m => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', boxShadow: '0 2px 8px #22c55e44' }}
        >
          {loading
            ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            : <UserPlus className="h-4 w-4" />
          }
          {loading ? 'Kaydediliyor...' : 'Kaydet ve Devam Et →'}
        </button>
      </form>
    </div>
  )
}
