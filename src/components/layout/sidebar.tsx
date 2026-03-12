'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BarChart3,
  MapPin,
  Settings,
  Car,
  ChevronRight,
  LogOut,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserProfile } from '@/lib/types/database'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Müşteriler', href: '/customers', icon: Users },
  { label: 'Yeni Müşteri', href: '/customers/new', icon: UserPlus },
]

const reportNav: NavItem[] = [
  { label: 'Merkez Raporu', href: '/reports/main', icon: BarChart3 },
  { label: 'Bergama Raporu', href: '/reports/bergama', icon: MapPin },
]

const settingsNav: NavItem[] = [
  { label: 'Kullanıcılar', href: '/settings/users', icon: Settings },
]

interface SidebarProps {
  profile: UserProfile | null
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isBergama = profile?.location?.type === 'satellite'
  const isAdmin = profile?.role === 'super_admin'
  const isManager = profile?.role === 'manager'

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#1E3A5F] flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
          <Car className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">EA Motors</p>
          <p className="text-white/50 text-xs">CRM Sistemi</p>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {profile?.full_name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{profile?.full_name ?? 'Kullanıcı'}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3 text-white/50" />
              <p className="text-white/50 text-xs truncate">{profile?.location?.name ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        <NavSection label="Müşteri Yönetimi" items={mainNav} pathname={pathname} />

        {(isAdmin || isManager) && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-white/30 text-xs font-medium px-2 uppercase tracking-wider">Raporlar</p>
            </div>
            {reportNav.map((item) => {
              if (item.href === '/reports/bergama' && !isAdmin) return null
              return <NavLink key={item.href} item={item} pathname={pathname} />
            })}
          </>
        )}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-white/30 text-xs font-medium px-2 uppercase tracking-wider">Yönetim</p>
            </div>
            {settingsNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* Brands */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['Fiat', 'Alfa', 'Jeep', 'İkinci El'].map((brand) => (
            <span
              key={brand}
              className="text-white/40 text-[10px] font-medium bg-white/5 rounded px-1.5 py-0.5"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2.5 px-5 py-3.5 text-white/60 hover:text-white hover:bg-white/5 transition-colors border-t border-white/10 text-sm"
      >
        <LogOut className="h-4 w-4" />
        <span>Çıkış Yap</span>
      </button>
    </aside>
  )
}

function NavSection({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <>
      <div className="pt-1 pb-1">
        <p className="text-white/30 text-xs font-medium px-2 uppercase tracking-wider">{label}</p>
      </div>
      {items.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
    </>
  )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
        isActive
          ? 'bg-white/15 text-white font-medium'
          : 'text-white/60 hover:text-white hover:bg-white/8'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
      {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
      {item.badge !== undefined && item.badge > 0 && (
        <span className="h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {item.badge}
        </span>
      )}
    </Link>
  )
}
