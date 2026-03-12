'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, UserPlus, BarChart3,
  MapPin, Settings, Car, LogOut, ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
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

function getNavGroups(isAdmin: boolean, isManager: boolean): NavGroup[] {
  const groups: NavGroup[] = [
    {
      title: 'MÜŞTERİ YÖNETİMİ',
      items: [
        { label: 'Ana Sayfa', href: '/dashboard', icon: LayoutDashboard, color: 'text-emerald-400' },
        { label: 'Müşteriler', href: '/customers', icon: Users, color: 'text-blue-400' },
        { label: 'Yeni Müşteri', href: '/customers/new', icon: UserPlus, color: 'text-purple-400' },
      ],
    },
  ]

  if (isAdmin || isManager) {
    const reportItems: NavItem[] = [
      { label: 'Merkez Raporu', href: '/reports/main', icon: BarChart3, color: 'text-amber-400' },
    ]
    if (isAdmin) {
      reportItems.push({ label: 'Bergama Raporu', href: '/reports/bergama', icon: MapPin, color: 'text-cyan-400' })
    }
    groups.push({ title: 'RAPORLAR', items: reportItems })
  }

  if (isAdmin) {
    groups.push({
      title: 'YÖNETİM',
      items: [
        { label: 'Kullanıcılar', href: '/settings/users', icon: Settings, color: 'text-gray-400' },
      ],
    })
  }

  return groups
}

export function Sidebar({ profile }: { profile: UserProfile | null }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = profile?.role === 'super_admin'
  const isManager = profile?.role === 'manager'
  const roleName = isAdmin ? 'Süper Admin' : isManager ? 'Yönetici' : 'Danışman'
  const groups = getNavGroups(isAdmin, isManager)

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  return (
    <aside className="w-60 bg-slate-900 flex flex-col h-screen shrink-0">
      {/* Logo */}
      <Link href="/dashboard" className="p-4 border-b border-slate-700/60 flex items-center gap-2.5 hover:bg-slate-800/60 transition-colors">
        <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
          <Car className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-sm leading-tight text-white">EA Motors</h2>
          <p className="text-xs text-slate-400">CRM Sistemi</p>
        </div>
      </Link>

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
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
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
        <div className="flex items-center gap-2.5 px-2 py-1.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 ring-1 ring-blue-500/30 flex items-center justify-center text-blue-300 text-xs font-bold shrink-0">
            {getInitials(profile?.full_name ?? 'U')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? 'Kullanıcı'}</p>
            <p className="text-[10px] text-slate-400 truncate">{roleName}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  )
}
