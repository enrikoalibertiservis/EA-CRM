'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { User, Phone, Mail, MapPin, Car, MessageSquare, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface CustomerFormProps {
  brands: { id: string; name: string; color: string }[]
  models: { id: string; brand_id: string; name: string }[]
  channels: { id: string; name: string; icon_name: string; color: string }[]
  consultants: { id: string; full_name: string }[]
  currentUserId: string
  currentLocationId: string
}

export function CustomerForm({ brands, models, channels, consultants, currentUserId, currentLocationId }: CustomerFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    phone_alt: '',
    email: '',
    tc_no: '',
    birth_date: '',
    address: '',
    city: '',
    district: '',
    brand_id: '',
    source_channel_id: '',
    interested_model: '',
    notes: '',
    consultant_id: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.full_name.trim()) e.full_name = 'Ad Soyad zorunludur'
    if (!form.phone.trim()) e.phone = 'Telefon zorunludur'
    if (!form.brand_id) e.brand_id = 'Marka seçimi zorunludur'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Lütfen zorunlu alanları doldurun')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...form,
          phone_alt: form.phone_alt || null,
          email: form.email || null,
          tc_no: form.tc_no || null,
          birth_date: form.birth_date || null,
          address: form.address || null,
          city: form.city || null,
          district: form.district || null,
          source_channel_id: form.source_channel_id || null,
          interested_model: form.interested_model || null,
          notes: form.notes || null,
          consultant_id: form.consultant_id || currentUserId,
          location_id: currentLocationId,
          created_by: currentUserId,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Müşteri başarıyla eklendi!')
      router.push(`/customers/${data.id}`)
    } catch (err) {
      console.error(err)
      toast.error('Müşteri eklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="h-4 w-4" />
        Müşteri Listesi
      </Link>

      <div className="space-y-5">
        {/* Kişisel Bilgiler */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Kişisel Bilgiler</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Ad Soyad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                placeholder="Müşteri adı soyadı"
                className={`w-full h-9 rounded-lg border px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.full_name ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.full_name && <p className="text-xs text-red-500 mt-0.5">{errors.full_name}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Telefon <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="0532 xxx xx xx"
                className={`w-full h-9 rounded-lg border px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.phone ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Alternatif Telefon</label>
              <input type="tel" value={form.phone_alt} onChange={(e) => update('phone_alt', e.target.value)} placeholder="0532 xxx xx xx" className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">E-posta</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="ornek@email.com" className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">TC Kimlik No</label>
              <input type="text" value={form.tc_no} onChange={(e) => update('tc_no', e.target.value)} maxLength={11} placeholder="11 haneli TC" className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Doğum Tarihi</label>
              <input type="date" value={form.birth_date} onChange={(e) => update('birth_date', e.target.value)} className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Adres */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-purple-50 flex items-center justify-center">
              <MapPin className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Adres Bilgileri</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="text-xs font-medium text-gray-700 block mb-1">Adres</label>
              <input type="text" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Açık adres" className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">İl</label>
              <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="İzmir" className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">İlçe</label>
              <input type="text" value={form.district} onChange={(e) => update('district', e.target.value)} placeholder="Bergama" className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* CRM Bilgileri */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-green-50 flex items-center justify-center">
              <Car className="h-3.5 w-3.5 text-green-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">CRM Bilgileri</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Marka <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => update('brand_id', brand.id)}
                    className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                      form.brand_id === brand.id
                        ? 'text-white shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                    style={form.brand_id === brand.id ? { backgroundColor: brand.color, borderColor: brand.color } : {}}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
              {errors.brand_id && <p className="text-xs text-red-500 mt-1">{errors.brand_id}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">İlgilendiği Model</label>
              <select value={form.interested_model} onChange={(e) => update('interested_model', e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Model seçin</option>
                {form.brand_id
                  ? models.filter(m => m.brand_id === form.brand_id).map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))
                  : models.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))
                }
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Nereden Ulaştı?</label>
              <div className="grid grid-cols-2 gap-1.5">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => update('source_channel_id', ch.id)}
                    className={`h-8 rounded-lg border text-xs font-medium transition-all ${
                      form.source_channel_id === ch.id
                        ? 'text-white shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                    style={form.source_channel_id === ch.id ? { backgroundColor: ch.color, borderColor: ch.color } : {}}
                  >
                    {ch.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Sorumlu Danışman</label>
              <select value={form.consultant_id} onChange={(e) => update('consultant_id', e.target.value)} className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Bana ata (varsayılan)</option>
                {consultants.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-medium text-gray-700 block mb-1">Notlar</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Müşteri hakkında notlar, özel istekler, vb."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/customers" className="h-9 px-4 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center">
            İptal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="h-9 px-6 rounded-lg bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#162d4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Müşteri Kaydet
          </button>
        </div>
      </div>
    </form>
  )
}
