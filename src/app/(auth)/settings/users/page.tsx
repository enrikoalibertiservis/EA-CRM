'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Shield, MapPin, Building2, ToggleLeft, ToggleRight,
  Trash2, Key, Pencil, X, Search, ShieldCheck, ShieldOff,
  Smartphone, Copy, CheckCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import type { UserProfile, Location } from '@/lib/types/database'
import Link from 'next/link'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Yönetici',
  manager: 'Satış Müdürü',
  consultant: 'Satış Danışmanı',
  resepsiyonist: 'Resepsiyonist',
}
const ROLE_COLORS: Record<string, string> = {
  super_admin: '#8B5CF6',
  manager: '#2563EB',
  consultant: '#059669',
  resepsiyonist: '#D97706',
}
const DEPT_LABELS: Record<string, string> = {
  satis: 'Satış',
  servis: 'Servis',
  yonetim: 'Yönetim',
  muhasebe: 'Muhasebe',
  diger: 'Diğer',
}

// ─── 2FA Setup Modal ─────────────────────────────────────────────────────────

interface TotpModalProps {
  userName: string
  onClose: () => void
  onSuccess: () => void
}

function TotpSetupModal({ userName, onClose, onSuccess }: TotpModalProps) {
  const [step, setStep]           = useState<'start' | 'qr' | 'verify'>('start')
  const [qrSvg, setQrSvg]         = useState('')
  const [secret, setSecret]       = useState('')
  const [factorId, setFactorId]   = useState('')
  const [code, setCode]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)

  const startEnroll = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Google Authenticator',
      })
      if (error) throw error
      setQrSvg(data.totp.qr_code)
      setSecret(data.totp.secret)
      setFactorId(data.id)
      setStep('qr')
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Kayıt başlatılamadı')
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = code.replace(/\D/g, '')
    if (clean.length !== 6) { toast.error('6 haneli kodu girin'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
      if (cErr) throw cErr
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId, challengeId: ch.id, code: clean,
      })
      if (vErr) { toast.error('Kod hatalı, tekrar deneyin'); setCode(''); return }
      toast.success('Google Authenticator başarıyla etkinleştirildi!')
      onSuccess()
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Doğrulama hatası')
    } finally {
      setLoading(false)
    }
  }

  const cancel = async () => {
    if (factorId) {
      const supabase = createClient()
      await supabase.auth.mfa.unenroll({ factorId })
    }
    onClose()
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Google Authenticator Kur</p>
              <p className="text-xs text-gray-400">{userName}</p>
            </div>
          </div>
          <button onClick={cancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Step: start */}
          {step === 'start' && (
            <>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">Adımlar:</p>
                <ol className="list-decimal ml-4 space-y-1 text-xs text-blue-700">
                  <li>Telefonunuza <strong>Google Authenticator</strong> indirin</li>
                  <li>Uygulamada <strong>+</strong> → <strong>QR kodu tara</strong></li>
                  <li>Gösterilen 6 haneli kodu girerek doğrulayın</li>
                </ol>
              </div>
              <button
                onClick={startEnroll}
                disabled={loading}
                className="w-full h-10 rounded-xl bg-[#1E3A5F] text-white text-sm font-semibold hover:bg-[#162d4a] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading
                  ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  : <Smartphone className="h-4 w-4" />
                }
                {loading ? 'Hazırlanıyor...' : 'Başlat'}
              </button>
            </>
          )}

          {/* Step: QR */}
          {step === 'qr' && (
            <>
              <p className="text-xs text-gray-500 text-center">QR kodu Google Authenticator ile tarayın</p>
              <div className="flex justify-center">
                <div className="p-3 bg-white rounded-xl border-2 border-gray-100 shadow-sm"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </div>
              {/* Manuel giriş */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                <p className="text-[11px] text-gray-400 mb-1.5">QR taranamıyorsa manuel girin:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[11px] font-mono text-gray-700 break-all">{secret}</code>
                  <button onClick={copySecret}
                    className="shrink-0 h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
                    {copied
                      ? <CheckCheck className="h-3.5 w-3.5 text-green-600" />
                      : <Copy className="h-3.5 w-3.5 text-gray-400" />
                    }
                  </button>
                </div>
              </div>
              <button onClick={() => setStep('verify')}
                className="w-full h-10 rounded-xl bg-[#1E3A5F] text-white text-sm font-semibold hover:bg-[#162d4a] transition-all">
                Taradım, Devam Et →
              </button>
            </>
          )}

          {/* Step: verify */}
          {step === 'verify' && (
            <form onSubmit={verifyCode} className="space-y-4">
              <p className="text-xs text-gray-500 text-center">Uygulamadaki 6 haneli kodu girin</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
                className="w-full h-14 rounded-xl border-2 border-gray-300 text-2xl font-mono text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition-all"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep('qr')}
                  className="flex-1 h-10 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Geri
                </button>
                <button type="submit" disabled={loading || code.length < 6}
                  className="flex-1 h-10 rounded-xl bg-[#1E3A5F] text-white text-sm font-semibold hover:bg-[#162d4a] disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all">
                  {loading && <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                  {loading ? 'Doğrulanıyor...' : 'Etkinleştir'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers]               = useState<UserProfile[]>([])
  const [locations, setLocations]       = useState<Location[]>([])
  const [loading, setLoading]           = useState(true)
  const [myRole, setMyRole]             = useState('')
  const [myUserId, setMyUserId]         = useState('')
  const [search, setSearch]             = useState('')
  const [editingUser, setEditingUser]   = useState<string | null>(null)
  const [passwordModal, setPasswordModal] = useState<string | null>(null)
  const [deleteModal, setDeleteModal]   = useState<string | null>(null)
  const [totpModal, setTotpModal]       = useState<string | null>(null)  // userId for 2FA setup
  const [newPassword, setNewPassword]   = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [mfaStatus, setMfaStatus]       = useState<Record<string, boolean>>({})

  const supabase = createClient()

  const loadMfaStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/mfa-status', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setMfaStatus(data)
      }
    } catch { /* ignore */ }
  }, [])

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMyUserId(user.id)

    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    setMyRole(profile?.role ?? '')
    if (profile?.role !== 'super_admin') { setLoading(false); return }

    const [{ data: usersData }, { data: locsData }] = await Promise.all([
      supabase.from('user_profiles').select('*, location:locations(*)').order('created_at'),
      supabase.from('locations').select('*').order('name'),
    ])
    setUsers((usersData ?? []) as UserProfile[])
    setLocations(locsData ?? [])
    await loadMfaStatus()
    setLoading(false)
  }, [supabase, loadMfaStatus])

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
  const totpUser = totpModal ? users.find(u => u.id === totpModal) : null

  return (
    <div className="space-y-6">
      <div className="flex justify-end -mt-4 mb-2">
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
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">2FA</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Durum</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, idx) => {
              const isEditing  = editingUser === user.id
              const hasMfa     = mfaStatus[user.id] === true
              const isMe       = user.id === myUserId

              return (
                <tr key={user.id} className={`border-t border-gray-50 hover:bg-blue-50/30 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/60' : ''}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: ROLE_COLORS[user.role] ?? '#6B7280' }}>
                        {user.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              value={user.full_name}
                              onChange={e => setUsers(prev => prev.map(u => u.id === user.id ? { ...u, full_name: e.target.value } : u))}
                              onBlur={e => updateField(user.id, 'full_name', e.target.value)}
                              className="h-7 w-36 rounded border border-gray-200 bg-white text-xs px-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <input
                              value={user.phone ?? ''}
                              onChange={e => setUsers(prev => prev.map(u => u.id === user.id ? { ...u, phone: e.target.value } : u))}
                              onBlur={e => updateField(user.id, 'phone', e.target.value)}
                              placeholder="Telefon"
                              className="h-7 w-36 rounded border border-gray-200 bg-white text-xs px-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
                            <p className="text-[11px] text-gray-400">{user.phone ?? '—'}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <select value={user.role} onChange={e => updateField(user.id, 'role', e.target.value)}
                        className="h-7 rounded-lg border border-gray-200 bg-white text-xs px-2 font-medium text-gray-700 appearance-none shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none">
                        <option value="super_admin">Yönetici</option>
                        <option value="manager">Satış Müdürü</option>
                        <option value="consultant">Satış Danışmanı</option>
                        <option value="resepsiyonist">Resepsiyonist</option>
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
                        className="h-7 rounded-lg border border-gray-200 bg-white text-xs px-2 font-medium text-gray-700 appearance-none shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none">
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-700">{user.location?.name ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    {isEditing ? (
                      <select value={user.department ?? ''} onChange={e => updateField(user.id, 'department', e.target.value)}
                        className="h-7 rounded-lg border border-gray-200 bg-white text-xs px-2 font-medium text-gray-700 appearance-none shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none">
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

                  {/* ── 2FA column ── */}
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span title={hasMfa ? '2FA Aktif' : '2FA Yok'}>
                        {hasMfa
                          ? <ShieldCheck className="h-4 w-4 text-green-500" />
                          : <ShieldOff className="h-4 w-4 text-gray-300" />
                        }
                      </span>
                      {/* Setup button only for current user */}
                      {isMe && !hasMfa && (
                        <button
                          onClick={() => setTotpModal(user.id)}
                          title="2FA Kur"
                          className="h-6 w-6 rounded-md flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-500 transition-colors"
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
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

      {/* ── 2FA Setup Modal ── */}
      {totpModal && totpUser && (
        <TotpSetupModal
          userName={totpUser.full_name}
          onClose={() => setTotpModal(null)}
          onSuccess={async () => {
            setTotpModal(null)
            await loadMfaStatus()
          }}
        />
      )}

      {/* ── Password Modal ── */}
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

      {/* ── Delete Modal ── */}
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
