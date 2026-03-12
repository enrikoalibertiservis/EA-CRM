'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { UserPlus, ArrowLeft, Mail, Lock, User, Phone, Building2, Shield, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import type { Location } from '@/lib/types/database'

export default function NewUserPage() {
  const router = useRouter()
  const supabase = createClient()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [myRole, setMyRole] = useState('')
  const [pageLoading, setPageLoading] = useState(true)

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'consultant',
    location_id: '',
    department: '',
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
      setMyRole(profile?.role ?? '')
      const { data: locs } = await supabase.from('locations').select('*').order('name')
      setLocations(locs ?? [])
      if (locs && locs.length > 0) setForm(f => ({ ...f, location_id: locs[0].id }))
      setPageLoading(false)
    }
    load()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.email || !form.password || !form.full_name || !form.role || !form.location_id) {
      toast.error('Zorunlu alanları doldurun')
      return
    }
    if (form.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(`${form.full_name} başarıyla oluşturuldu`)
      router.push('/settings/users')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Kullanıcı oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (myRole !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Shield className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">Bu sayfaya erişim yetkiniz yok</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Yeni Kullanıcı Oluştur</h1>
            <p className="text-xs text-gray-500">Sisteme yeni personel ekleyin</p>
          </div>
        </div>
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Geri
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.04] p-6 space-y-5">

        {/* Name + Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <User className="h-3.5 w-3.5 text-gray-400" /> Ad Soyad <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Örn: Ahmet Yılmaz"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Phone className="h-3.5 w-3.5 text-gray-400" /> Telefon
            </label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="05xx xxx xx xx"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Email + Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Mail className="h-3.5 w-3.5 text-gray-400" /> E-posta <span className="text-red-500">*</span>
            </label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ornek@eamotors.com"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Lock className="h-3.5 w-3.5 text-gray-400" /> Şifre <span className="text-red-500">*</span>
            </label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="En az 6 karakter"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required minLength={6} />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Role + Location + Department */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Shield className="h-3.5 w-3.5 text-gray-400" /> Rol <span className="text-red-500">*</span>
            </label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="consultant">Danışman</option>
              <option value="manager">Yönetici</option>
              <option value="super_admin">Süper Admin</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Building2 className="h-3.5 w-3.5 text-gray-400" /> Lokasyon <span className="text-red-500">*</span>
            </label>
            <select value={form.location_id} onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
              <Briefcase className="h-3.5 w-3.5 text-gray-400" /> Departman
            </label>
            <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seçiniz</option>
              <option value="satis">Satış</option>
              <option value="servis">Servis</option>
              <option value="yonetim">Yönetim</option>
              <option value="muhasebe">Muhasebe</option>
              <option value="diger">Diğer</option>
            </select>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          Kullanıcı oluşturulduğunda belirlediğiniz e-posta ve şifre ile sisteme giriş yapabilecektir. Şifre daha sonra bu panel üzerinden güncellenebilir.
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()}
            className="h-10 px-5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            İptal
          </button>
          <button type="submit" disabled={loading}
            className="h-10 px-6 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
            {loading ? (
              <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Oluşturuluyor...</>
            ) : (
              <><UserPlus className="h-4 w-4" /> Kullanıcı Oluştur</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
