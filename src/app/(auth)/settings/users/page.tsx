'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Shield, MapPin, Building2, ToggleLeft, ToggleRight, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import type { UserProfile, Location } from '@/lib/types/database'

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

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setMyRole(profile?.role ?? '')

      if (profile?.role !== 'super_admin') {
        setLoading(false)
        return
      }

      const [{ data: usersData }, { data: locsData }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*, location:locations(*)')
          .order('created_at'),
        supabase.from('locations').select('*').order('name'),
      ])

      setUsers((usersData ?? []) as UserProfile[])
      setLocations(locsData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const toggleActive = async (userId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !currentActive })
      .eq('id', userId)

    if (error) {
      toast.error('Güncelleme başarısız')
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: !currentActive } : u))
      toast.success(currentActive ? 'Kullanıcı pasif yapıldı' : 'Kullanıcı aktif edildi')
    }
  }

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      toast.error('Rol güncellenemedi')
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole as UserProfile['role'] } : u))
      toast.success('Rol güncellendi')
    }
  }

  const updateLocation = async (userId: string, locationId: string) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ location_id: locationId })
      .eq('id', userId)

    if (error) {
      toast.error('Lokasyon güncellenemedi')
    } else {
      const newLoc = locations.find((l) => l.id === locationId)
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, location_id: locationId, location: newLoc } : u))
      toast.success('Lokasyon güncellendi')
    }
  }

  if (myRole !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Shield className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">Bu sayfaya erişim yetkiniz yok</p>
        <p className="text-xs mt-1">Sadece Süper Admin kullanıcı yönetimini yapabilir</p>
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

  const mainUsers = users.filter((u) => u.location?.type === 'main')
  const bergamaUsers = users.filter((u) => u.location?.type === 'satellite')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Kullanıcı Yönetimi</h1>
          <p className="text-xs text-gray-500">{users.length} kayıtlı kullanıcı</p>
        </div>
      </div>
        {/* Info */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <strong>Not:</strong> Yeni kullanıcılar sisteme Google ile giriş yaptıktan sonra Supabase&apos;de manuel olarak <code>user_profiles</code> tablosuna eklenir. Burada mevcut kullanıcıların rol ve lokasyonlarını yönetebilirsiniz.
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Toplam Kullanıcı', value: users.length, icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Süper Admin', value: users.filter((u) => u.role === 'super_admin').length, icon: Shield, color: '#8B5CF6', bg: '#F5F3FF' },
            { label: 'Merkez', value: mainUsers.length, icon: Building2, color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Bergama', value: bergamaUsers.length, icon: MapPin, color: '#059669', bg: '#ECFDF5' },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: stat.bg }}>
                  <Icon className="h-4 w-4" style={{ color: stat.color }} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* User Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Kullanıcı Listesi</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Kullanıcı</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Rol</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Lokasyon</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Kayıt</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user, idx) => (
                  <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: ROLE_COLORS[user.role] ?? '#6B7280' }}
                        >
                          {user.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
                          <p className="text-xs text-gray-400">{user.phone ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                        className="h-7 rounded-lg border border-gray-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ color: ROLE_COLORS[user.role] }}
                      >
                        <option value="super_admin">Süper Admin</option>
                        <option value="manager">Yönetici</option>
                        <option value="consultant">Danışman</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.location_id}
                        onChange={(e) => updateLocation(user.id, e.target.value)}
                        className="h-7 rounded-lg border border-gray-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-500">{formatDate(user.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(user.id, user.is_active)}
                        className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
                        style={{ color: user.is_active ? '#10B981' : '#9CA3AF' }}
                      >
                        {user.is_active ? (
                          <ToggleRight className="h-5 w-5" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                        <span className="hidden md:inline">{user.is_active ? 'Aktif' : 'Pasif'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  )
}
