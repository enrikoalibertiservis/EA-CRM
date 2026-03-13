'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { UserPlus, Phone, User, Car, Zap } from 'lucide-react'

interface LocationOption {
  id: string
  name: string
}

interface Props {
  brands:    { id: string; name: string; color: string }[]
  models:    { id: string; brand_id: string; name: string }[]
  locations?: LocationOption[]
  currentUserId:     string
  currentLocationId: string
}

function formatGSM(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 4) return d
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`
  if (d.length <= 9) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`
}

export function QuickRegister({ brands, models, locations, currentUserId, currentLocationId }: Props) {
  const router = useRouter()
  const [loading, setLoading]   = useState(false)
  const [name, setName]         = useState('')
  const [phone, setPhone]       = useState('')
  const [brandId, setBrandId]   = useState('')
  const [model, setModel]       = useState('')
  const [locationId, setLocationId] = useState(currentLocationId)
  const [errors, setErrors]     = useState<Record<string, string>>({})

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
        location_id:      locationId || currentLocationId,
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
    <div className="bg-white rounded-2xl border-2 border-green-300 overflow-hidden h-full flex flex-col"
      style={{ boxShadow: '0 2px 12px 0 #22c55e18' }}>

      {/* Header — kompakt */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-green-100"
        style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: '#16a34a' }}>
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 leading-tight">Hızlı Müşteri Kaydı</h3>
          <p className="text-[10px] text-green-600">Müşteriyi bekletmeden sisteme girin</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3 flex-1">

        {/* Ad Soyad + Telefon — yan yana */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-medium text-gray-500 block mb-1">
              Ad Soyad <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setErrors(p => { const n={...p}; delete n.name; return n }) }}
                placeholder="Ad Soyad"
                className={`w-full h-8 rounded-lg border pl-7 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-400 transition-all ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
              />
            </div>
            {errors.name && <p className="text-[10px] text-red-500 mt-0.5">{errors.name}</p>}
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-500 block mb-1">
              Telefon <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(formatGSM(e.target.value)); setErrors(p => { const n={...p}; delete n.phone; return n }) }}
                placeholder="0532 456 78 90"
                maxLength={14}
                className={`w-full h-8 rounded-lg border pl-7 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-400 transition-all ${errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
              />
            </div>
            {errors.phone && <p className="text-[10px] text-red-500 mt-0.5">{errors.phone}</p>}
          </div>
        </div>

        {/* Marka */}
        <div>
          <label className="text-[11px] font-medium text-gray-500 block mb-1">
            Marka <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {brands.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => { handleBrand(b.id); setErrors(p => { const n={...p}; delete n.brand; return n }) }}
                className="h-7 px-3 rounded-lg border text-xs font-semibold transition-all"
                style={brandId === b.id
                  ? { backgroundColor: b.color + 'cc', borderColor: b.color, color: '#fff' }
                  : { backgroundColor: b.color + '10', borderColor: b.color + '40', color: b.color }
                }
              >
                {b.name}
              </button>
            ))}
          </div>
          {errors.brand && <p className="text-[10px] text-red-500 mt-0.5">{errors.brand}</p>}
        </div>

        {/* Model + Lokasyon — yan yana */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-medium text-gray-500 block mb-1">
              <Car className="inline h-3 w-3 mr-0.5 text-gray-400" />
              Model
            </label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Seçin</option>
              {filteredModels.map(m => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          {locations && locations.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-gray-500 block mb-1">Lokasyon</label>
              <div className="flex gap-1">
                {locations.map(loc => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setLocationId(loc.id)}
                    className="flex-1 h-8 rounded-lg border text-[10px] font-semibold transition-all truncate px-1"
                    style={locationId === loc.id
                      ? { backgroundColor: '#1E3A5F', borderColor: '#1E3A5F', color: '#fff' }
                      : { backgroundColor: '#fff', borderColor: '#E2E8F0', color: '#64748b' }
                    }
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit — kibar, hover ile dolgun */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-9 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 border-2 border-green-500 text-green-700 bg-white hover:bg-green-500 hover:text-white active:scale-[0.98] mt-auto"
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
