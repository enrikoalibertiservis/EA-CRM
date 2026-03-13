'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  User, MapPin, Car, MessageSquare, ChevronLeft,
  PhoneCall, Globe, Share2, UserCheck,
  HelpCircle, Building2, Phone, Users, Wrench, Shield,
  Radio, Newspaper, BookOpen, Search, Heart,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

// ─── GSM Formatter ────────────────────────────────────────────────────────────

function formatGSM(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`
}

// ─── Kanal ikon haritası ───────────────────────────────────────────────────────

const CHANNEL_ICONS: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  'Sosyal Medya':     { icon: Share2,      color: '#EC4899', bg: '#FDF2F8' },
  'Telefon Araması':  { icon: PhoneCall,   color: '#10B981', bg: '#ECFDF5' },
  '2. El Müşterisi':  { icon: Users,       color: '#F97316', bg: '#FFF7ED' },
  'Servis Müşterisi': { icon: Wrench,      color: '#3B82F6', bg: '#EFF6FF' },
  'Sigorta Müşterisi':{ icon: Shield,      color: '#8B5CF6', bg: '#F5F3FF' },
  'Radyo Reklamı':    { icon: Radio,       color: '#F59E0B', bg: '#FFFBEB' },
  'Gazete Reklamı':   { icon: Newspaper,   color: '#6B7280', bg: '#F9FAFB' },
  'Dergi Reklamı':    { icon: BookOpen,    color: '#14B8A6', bg: '#F0FDFA' },
  'Google Araması':   { icon: Search,      color: '#4285F4', bg: '#EFF6FF' },
  'Web Sayfası':      { icon: Globe,       color: '#06B6D4', bg: '#ECFEFF' },
  'Satış Referans':   { icon: UserCheck,   color: '#EAB308', bg: '#FEFCE8' },
  'Sadık Müşteri':    { icon: Heart,       color: '#EF4444', bg: '#FFF1F2' },
  'Diğer':            { icon: HelpCircle,  color: '#9CA3AF', bg: '#F9FAFB' },
}

function getChannelMeta(name: string) {
  return CHANNEL_ICONS[name] ?? { icon: MessageSquare, color: '#6B7280', bg: '#F9FAFB' }
}

interface ContactType {
  id: string
  name: string
  slug: string
  icon_name: string | null
  color: string
}

interface LocationOption {
  id: string
  name: string
}

interface CustomerFormProps {
  brands: { id: string; name: string; color: string }[]
  models: { id: string; brand_id: string; name: string }[]
  channels: { id: string; name: string; icon_name: string; color: string }[]
  consultants: { id: string; full_name: string }[]
  contactTypes: ContactType[]
  locations?: LocationOption[]
  currentUserId: string
  currentLocationId: string
}

// İkon adından LucideIcon'a dönüşüm haritası
const CONTACT_TYPE_ICONS: Record<string, LucideIcon> = {
  'building2':   Building2,
  'phone-call':  PhoneCall,
  'phone':       Phone,
  'message-square': MessageSquare,
  'users':       User,
  'car':         Car,
}

function getContactTypeIcon(iconName: string | null): LucideIcon {
  if (!iconName) return MessageSquare
  return CONTACT_TYPE_ICONS[iconName] ?? MessageSquare
}

export function CustomerForm({ brands, models, channels, consultants, contactTypes, locations, currentUserId, currentLocationId }: CustomerFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    city: '',
    district: '',
    brand_id: '',
    source_channel_id: '',
    interested_model: '',
    initial_contact_type: '',
    notes: '',
    consultant_id: '',
    location_id: currentLocationId,
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
          full_name: form.full_name,
          phone: form.phone,
          city: form.city || null,
          district: form.district || null,
          brand_id: form.brand_id,
          source_channel_id: form.source_channel_id || null,
          interested_model: form.interested_model || null,
          initial_contact_type: form.initial_contact_type || null,
          notes: form.notes || null,
          consultant_id: form.consultant_id || currentUserId,
          location_id: form.location_id || currentLocationId,
          created_by: currentUserId,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Müşteri başarıyla eklendi!')
      router.push('/dashboard')
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
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE' }}>
              <User className="h-4.5 w-4.5" style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Kişisel Bilgiler</h2>
              <p className="text-[11px] text-gray-400">Ad, iletişim ve kimlik bilgileri</p>
            </div>
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
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', formatGSM(e.target.value))}
                  placeholder="0532 456 78 90"
                  maxLength={14}
                  className={`w-full h-9 rounded-lg border pl-9 pr-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.phone ? 'border-red-400' : 'border-gray-300'}`}
                />
              </div>
              {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>}
            </div>
          </div>
        </div>

        {/* Adres */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: '#F5F3FF', border: '1.5px solid #DDD6FE' }}>
              <MapPin className="h-4 w-4" style={{ color: '#8B5CF6' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Adres Bilgileri</h2>
              <p className="text-[11px] text-gray-400">İl, ilçe ve açık adres</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">İl</label>
              <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="İzmir" className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">İlçe</label>
              <input type="text" value={form.district} onChange={(e) => update('district', e.target.value)} placeholder="Karşıyaka" className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* CRM Bilgileri */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0' }}>
              <Car className="h-4 w-4" style={{ color: '#10B981' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">CRM Bilgileri</h2>
              <p className="text-[11px] text-gray-400">Marka, model ve kaynak kanal</p>
            </div>
          </div>
          <div className="space-y-4">
            {/* Marka + Model */}
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
            </div>

            {/* Nereden Ulaştı — yatay wrap */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-2">Nereden Ulaştı? <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-1.5">
                {channels.map((ch) => {
                  const meta = getChannelMeta(ch.name)
                  const ChIcon = meta.icon
                  const isSelected = form.source_channel_id === ch.id
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => update('source_channel_id', isSelected ? '' : ch.id)}
                      className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all whitespace-nowrap ${
                        isSelected ? 'text-white shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      style={isSelected ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
                    >
                      <div
                        className="h-4 w-4 rounded flex items-center justify-center shrink-0"
                        style={isSelected ? { background: 'rgba(255,255,255,0.25)' } : { background: meta.bg }}
                      >
                        <ChIcon className="h-2.5 w-2.5" style={{ color: isSelected ? '#fff' : meta.color }} />
                      </div>
                      {ch.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Temas Türü — parametrik */}
            {contactTypes.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1.5">Temas Türü</label>
                <div className="flex flex-wrap gap-2">
                  {contactTypes.map((ct) => {
                    const Icon = getContactTypeIcon(ct.icon_name)
                    const isSelected = form.initial_contact_type === ct.slug
                    const bg = ct.color + '18'
                    return (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => update('initial_contact_type', isSelected ? '' : ct.slug)}
                        className={`flex items-center gap-2 h-9 px-4 rounded-lg border text-xs font-semibold transition-all ${
                          isSelected ? 'text-white shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        style={isSelected ? { backgroundColor: ct.color, borderColor: ct.color } : {}}
                      >
                        <div
                          className="h-5 w-5 rounded-md flex items-center justify-center shrink-0"
                          style={isSelected ? { background: 'rgba(255,255,255,0.25)' } : { background: bg }}
                        >
                          <Icon className="h-3 w-3" style={{ color: isSelected ? '#fff' : ct.color }} />
                        </div>
                        {ct.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Sorumlu Danışman + Şube */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Sorumlu Danışman</label>
                <select value={form.consultant_id} onChange={(e) => update('consultant_id', e.target.value)} className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Bana ata (varsayılan)</option>
                  {consultants.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              {locations && locations.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    <Building2 className="inline h-3 w-3 mr-1 text-gray-400" />
                    Şube
                  </label>
                  <div className="flex gap-2">
                    {locations.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => update('location_id', loc.id)}
                        className={`flex-1 h-9 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                          form.location_id === loc.id
                            ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-700 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
