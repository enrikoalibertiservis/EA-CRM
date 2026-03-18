'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, UserPlus,
  Settings, Car, LogOut, ChevronRight,
  ShieldCheck, UserCog, TrendingUp, Smartphone, X, Copy, CheckCheck,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { UserProfile } from '@/lib/types/database'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  color: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

function getNavGroups(isAdmin: boolean, isManager: boolean, isReceptionist: boolean): NavGroup[] {
  const groups: NavGroup[] = [
    {
      title: 'MÜŞTERİ YÖNETİMİ',
      items: [
        { label: 'Ana Sayfa', href: '/dashboard', icon: LayoutDashboard, color: 'text-emerald-400' },
        { label: 'Müşteri Süreçleri', href: '/customers', icon: Users, color: 'text-blue-400' },
        { label: 'Yeni Müşteri', href: '/customers/new', icon: UserPlus, color: 'text-purple-400' },
      ],
    },
  ]

  if (isAdmin || isManager || isReceptionist) {
    groups.push({
      title: 'RAPORLAR',
      items: [
        { label: 'Raporlar', href: '/reports/consultants', icon: TrendingUp, color: 'text-emerald-400' },
      ],
    })
  }

  if (isAdmin) {
    groups.push({
      title: 'KULLANICI YÖNETİMİ',
      items: [
        { label: 'Kullanıcı Listesi', href: '/settings/users', icon: Users, color: 'text-indigo-400' },
        { label: 'Yeni Kullanıcı', href: '/settings/users/new', icon: UserPlus, color: 'text-teal-400' },
      ],
    })
    groups.push({
      title: 'SİSTEM',
      items: [
        { label: 'Ayarlar', href: '/settings', icon: Settings, color: 'text-gray-400' },
      ],
    })
  }

  return groups
}

// ─── 2FA Setup Modal (inline, for all users) ──────────────────────────────────
function SidebarTotpModal({ onClose }: { onClose: () => void }) {
  const supabase = createClient()
  const [step, setStep]         = useState<'start' | 'qr' | 'verify'>('start')
  const [qrSvg, setQrSvg]       = useState('')
  const [secret, setSecret]     = useState('')
  const [factorId, setFactorId] = useState('')
  const [code, setCode]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState(false)

  const startEnroll = async () => {
    setLoading(true)
    try {
      // Mevcut tüm TOTP faktörlerini temizle (doğrulanmış veya doğrulanmamış)
      const { data: listData } = await supabase.auth.mfa.listFactors()
      const existing = listData?.totp ?? []
      for (const f of existing) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Google Authenticator' })
      if (error) throw error
      setQrSvg(data.totp.qr_code)
      setSecret(data.totp.secret)
      setFactorId(data.id)
      setStep('qr')
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Kayıt başlatılamadı')
    } finally { setLoading(false) }
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = code.replace(/\D/g, '')
    if (clean.length !== 6) { toast.error('6 haneli kodu girin'); return }
    setLoading(true)
    try {
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
      if (cErr) throw cErr
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: clean })
      if (vErr) { toast.error('Kod hatalı, tekrar deneyin'); setCode(''); return }
      toast.success('Google Authenticator başarıyla etkinleştirildi!')
      onClose()
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Doğrulama hatası')
    } finally { setLoading(false) }
  }

  const cancel = async () => {
    if (factorId) await supabase.auth.mfa.unenroll({ factorId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Google Authenticator Kur</p>
              <p className="text-xs text-gray-400">İki faktörlü doğrulama</p>
            </div>
          </div>
          <button onClick={cancel} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {step === 'start' && (
            <>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-700 space-y-1">
                <p className="font-semibold mb-1">Adımlar:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Telefonunuza <strong>Google Authenticator</strong> indirin</li>
                  <li>Uygulamada <strong>+</strong> → <strong>QR kodu tara</strong></li>
                  <li>6 haneli kodu girerek doğrulayın</li>
                </ol>
              </div>
              <button onClick={startEnroll} disabled={loading}
                className="w-full h-10 rounded-xl bg-[#1E3A5F] text-white text-sm font-semibold hover:bg-[#162d4a] disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : <Smartphone className="h-4 w-4" />}
                {loading ? 'Hazırlanıyor...' : 'Başlat'}
              </button>
            </>
          )}
          {step === 'qr' && (
            <>
              <p className="text-xs text-gray-500 text-center">QR kodu Google Authenticator ile tarayın</p>
              <div className="flex justify-center">
                <div className="p-3 bg-white rounded-xl border-2 border-gray-100 shadow-sm" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5 flex items-center gap-2">
                <code className="flex-1 text-[10px] text-gray-600 font-mono break-all">{secret}</code>
                <button onClick={() => { navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 shrink-0">
                  {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <button onClick={() => setStep('verify')}
                className="w-full h-10 rounded-xl bg-[#1E3A5F] text-white text-sm font-semibold hover:bg-[#162d4a]">
                Kodu Taradım →
              </button>
            </>
          )}
          {step === 'verify' && (
            <form onSubmit={verifyCode} className="space-y-3">
              <p className="text-xs text-gray-500 text-center">Uygulamadaki 6 haneli kodu girin</p>
              <input type="text" inputMode="numeric" maxLength={6} value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" autoFocus
                className="w-full h-11 rounded-xl border-2 border-gray-200 text-center text-2xl font-mono font-bold tracking-widest focus:outline-none focus:border-blue-500" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep('qr')}
                  className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Geri
                </button>
                <button type="submit" disabled={loading || code.length < 6}
                  className="flex-1 h-10 rounded-xl bg-[#1E3A5F] text-white text-sm font-semibold hover:bg-[#162d4a] disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {loading && <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
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

export function Sidebar({ profile, mobileOpen = false, onClose }: {
  profile: UserProfile | null
  mobileOpen?: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [showTotpModal, setShowTotpModal] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = profile?.role === 'super_admin'
  const isManager = profile?.role === 'manager'
  const isReceptionist = profile?.role === 'resepsiyonist'
  const roleName = isAdmin ? 'Yönetici'
    : isManager ? 'Satış Müdürü'
    : isReceptionist ? 'Resepsiyonist'
    : 'Satış Danışmanı'
  const groups = getNavGroups(isAdmin, isManager, isReceptionist)

  const allHrefs = groups.flatMap(g => g.items.map(i => i.href))

  const isActive = (href: string) => {
    if (pathname === href) return true
    if (href.endsWith('/new') || href === '/dashboard' || href === '/settings') return false
    return (
      pathname.startsWith(href + '/') &&
      !allHrefs.some(other => other !== href && pathname.startsWith(other))
    )
  }

  const handleNavClick = () => { onClose?.() }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col h-full transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:static md:translate-x-0 md:w-60 md:z-auto md:h-screen md:shrink-0
      `}>
      {/* Logo + close button */}
      <div className="flex items-center border-b border-slate-700/60">
        <Link href="/dashboard" onClick={handleNavClick} className="flex-1 p-4 flex items-center gap-2.5 hover:bg-slate-800/60 transition-colors">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
            <Car className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight text-white">Enriko Aliberti</h2>
            <p className="text-xs text-slate-400">CRM Sistemi</p>
          </div>
        </Link>
        <button onClick={onClose} className="md:hidden p-4 text-slate-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-3 mb-1.5">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                      active
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                      active ? 'bg-white/[0.15]' : 'bg-white/[0.05]'
                    }`}>
                      <Icon className={`h-3.5 w-3.5 ${active ? 'text-white' : item.color}`} />
                    </div>
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="h-3 w-3 text-slate-500" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-slate-700/60 p-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 ring-1 ring-blue-500/30 flex items-center justify-center text-blue-300 text-xs font-bold shrink-0">
            {getInitials(profile?.full_name ?? 'U')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? 'Kullanıcı'}</p>
            <p className="text-[10px] text-slate-400 truncate">{roleName}</p>
          </div>
        </div>
        <button
          onClick={() => setShowTotpModal(true)}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
        >
          <Smartphone className="h-3.5 w-3.5" />
          2FA Kur / Güncelle
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Çıkış Yap
        </button>
      </div>

      {showTotpModal && <SidebarTotpModal onClose={() => setShowTotpModal(false)} />}
    </aside>
    </>
  )
}
