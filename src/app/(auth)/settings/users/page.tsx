'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Shield, MapPin, Building2, ToggleLeft, ToggleRight,
  Trash2, Key, Pencil, X, Search, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import type { UserProfile, Location } from '@/lib/types/database'
import Link from 'next/link'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Süper Admin',
  manager: 'Yönetici',
  consultant: 'Danışman',
}
const ROLE_COLORS: Record<string, string> = {
  super_admin: '#8B5CF6',
  manager: '#2563EB',
  consultant: '#059669',
}
const DEPT_LABELS: Record<string, string> = {
  satis: 'Satış',
  servis: 'Servis',
  yonetim: 'Yönetim',
  muhasebe: 'Muhasebe',
  diger: 'Diğer',
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState('')
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [passwordModal, setPasswordModal] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createClient()

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    setMyRole(profile?.role ?? '')
    if (profile?.role !== 'super_admin') { setLoading(false); return }

    const [{ data: usersData }, { data: locsData }] = await Promise.all([
      supabase.from('user_profiles').select('*, location:locations(*)').order('created_at'),
      supabase.from('locations').select('*').order('name'),
    ])
    setUsers((usersData ?? []) as UserProfile[])
    setLocations(locsData ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  const updateField = async (userId: string, field: string, value: string) => {
    const { error } = await supabase.from('user_profiles').update({ [field]: value || null }).eq('id', userId)
    if (error) { toast.error('Güncelleme başarısız'); return }
    if (field === 'location_id') {
      const loc = locations.find(l => l.id === value)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value, location: loc } : u))
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value } : u))
    }
    toast.success('Güncellendi')
  }

  const toggleActive = async (userId: string, current: boolean) => {
    const { error } = await supabase.from('user_profiles').update({ is_active: !current }).eq('id', userId)
    if (error) { toast.error('Güncelleme başarısız'); return }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u))
    toast.success(current ? 'Kullanıcı pasif yapıldı' : 'Kullanıcı aktif edildi')
  }

  const handlePasswordUpdate = async () => {
    if (!passwordModal || !newPassword) return
    if (newPassword.length < 6) { toast.error('Şifre en az 6 karakter olmalı'); return }
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: passwordModal, password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Şifre güncellendi')
      setPasswordModal(null)
      setNewPassword('')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Şifre güncellenemedi')
    } finally { setActionLoading(false) }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteModal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(prev => prev.filter(u => u.id !== deleteModal))
      toast.success('Kullanıcı silindi')
      setDeleteModal(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Silinemedi')
    } finally { setActionLoading(false) }
  }

  if (myRole !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Shield className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">Bu sayfaya erişim yetkiniz yok</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const filtered = users.filter(u => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return u.full_name.toLowerCase().includes(s) || u.phone?.includes(s) || u.location?.name?.toLowerCase().includes(s)
  })

  const locCounts = locations.map(l => ({ ...l, count: users.filter(u => u.location_id === l.id).length }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Kullanıcı Yönetimi</h1>
            <p className="text-xs text-gray-500">{users.length} kayıtlı kullanıcı</p>
          </div>
        </div>
        <Link href="/settings/users/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white text-sm shadow-sm hover:bg-blue-700 transition-colors">
          + Yeni Kullanıcı
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Toplam', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Aktif', value: users.filter(u => u.is_active).length, icon: Shield, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
          ...locCounts.map(l => ({
            label: l.name, value: l.count,
            icon: l.type === 'main' ? Building2 : MapPin,
            color: l.type === 'main' ? 'text-indigo-600' : 'text-teal-600',
            bg: l.type === 'main' ? 'bg-indigo-50' : 'bg-teal-50',
            border: l.type === 'main' ? 'border-indigo-100' : 'border-teal-100',
          })),
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`flex items-center gap-3 rounded-xl border ${s.border} ${s.bg} px-4 py-3 shadow-sm`}>
              <div className={`rounded-lg bg-white/80 p-2 shadow-sm ${s.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-500">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type="text" placeholder="İsim, telefon veya lokasyon ara..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Kullanıcı</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rol</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Lokasyon</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Departman</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Kayıt</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Durum</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, idx) => {
              const isEditing = editingUser === user.id
              return (
                <tr key={user.id} className={`border-t border-gray-50 hover:bg-blue-50/30 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/60' : ''}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: ROLE_COLORS[user.role] ?? '#6B7280' }}>
                        {user.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
                        <p className="text-[11px] text-gray-400">{user.phone ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <select value={user.role} onChange={e => updateField(user.id, 'role', e.target.value)}
                        className="h-7 rounded border border-gray-200 bg-white text-xs px-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        <option value="super_admin">Süper Admin</option>
                        <option value="manager">Yönetici</option>
                        <option value="consultant">Danışman</option>
                      </select>
                    ) : (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                        style={{ color: ROLE_COLORS[user.role], borderColor: ROLE_COLORS[user.role] + '40', backgroundColor: ROLE_COLORS[user.role] + '10' }}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <select value={user.location_id} onChange={e => updateField(user.id, 'location_id', e.target.value)}
                        className="h-7 rounded border border-gray-200 bg-white text-xs px-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-700">{user.location?.name ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    {isEditing ? (
                      <select value={user.department ?? ''} onChange={e => updateField(user.id, 'department', e.target.value)}
                        className="h-7 rounded border border-gray-200 bg-white text-xs px-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        <option value="">Seçiniz</option>
                        <option value="satis">Satış</option>
                        <option value="servis">Servis</option>
                        <option value="yonetim">Yönetim</option>
                        <option value="muhasebe">Muhasebe</option>
                        <option value="diger">Diğer</option>
                      </select>
                    ) : (
                      <span className="text-xs text-gray-600">{user.department ? DEPT_LABELS[user.department] ?? user.department : '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <span className="text-xs text-gray-400">{formatDate(user.created_at)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button onClick={() => toggleActive(user.id, user.is_active)}
                      className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
                      style={{ color: user.is_active ? '#10B981' : '#9CA3AF' }}>
                      {user.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditingUser(isEditing ? null : user.id)} title={isEditing ? 'Kapat' : 'Düzenle'}
                        className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${isEditing ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400'}`}>
                        {isEditing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => { setPasswordModal(user.id); setNewPassword('') }} title="Şifre Güncelle"
                        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-amber-100 text-gray-400 hover:text-amber-600 transition-colors">
                        <Key className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteModal(user.id)} title="Sil"
                        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Password Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Şifre Güncelle</h3>
              <button onClick={() => setPasswordModal(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              <strong>{users.find(u => u.id === passwordModal)?.full_name}</strong> için yeni şifre belirleyin.
            </p>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Yeni şifre (en az 6 karakter)"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setPasswordModal(null)} className="flex-1 h-9 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">İptal</button>
              <button onClick={handlePasswordUpdate} disabled={actionLoading || newPassword.length < 6}
                className="flex-1 h-9 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {actionLoading ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-red-600">Kullanıcı Sil</h3>
              <button onClick={() => setDeleteModal(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{users.find(u => u.id === deleteModal)?.full_name}</strong> kullanıcısını silmek istediğinize emin misiniz?
            </p>
            <p className="text-xs text-red-500 mb-4">Bu işlem geri alınamaz. Kullanıcı ve tüm auth kaydı silinir.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteModal(null)} className="flex-1 h-9 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">İptal</button>
              <button onClick={handleDelete} disabled={actionLoading}
                className="flex-1 h-9 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
