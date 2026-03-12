'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, UserPlus, BarChart3,
  MapPin, Settings, Car, LogOut, Building2, ChevronRight,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types/database'

interface NavItem { label: string; href: string; icon: React.ElementType }

const mainNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Müşteriler', href: '/customers', icon: Users },
  { label: 'Yeni Müşteri', href: '/customers/new', icon: UserPlus },
]

const reportNav: NavItem[] = [
  { label: 'Merkez Raporu', href: '/reports/main', icon: BarChart3 },
  { label: 'Bergama Raporu', href: '/reports/bergama', icon: MapPin },
]

const BRANDS = [
  { name: 'Fiat', color: '#CC0000' },
  { name: 'Alfa', color: '#8B0000' },
  { name: 'Jeep', color: '#2D5016' },
  { name: 'İkinci El', color: '#4A5568' },
]

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
  const roleName = profile?.role === 'super_admin' ? 'Süper Admin' : profile?.role === 'manager' ? 'Yönetici' : 'Danışman'

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] flex flex-col z-40" style={{ backgroundColor: '#1A2C4E' }}>

      {/* Logo area */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2D5A9E, #4F46E5)' }}>
            <Car className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">EA Motors</p>
            <p className="text-white/40 text-xs">CRM Sistemi</p>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="px-3 py-3 border-b border-white/10">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2D5A9E, #4F46E5)' }}>
            {getInitials(profile?.full_name ?? 'U')}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{profile?.full_name ?? 'Kullanıcı'}</p>
            <p className="text-white/40 text-[10px] truncate">{roleName} · {profile?.location?.name ?? ''}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-2 pb-1">Müşteri Yönetimi</p>
        {mainNav.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}

        {(isAdmin || isManager) && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-2">Raporlar</p>
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
              <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-2">Yönetim</p>
            </div>
            <NavLink item={{ label: 'Kullanıcılar', href: '/settings/users', icon: Settings }} pathname={pathname} />
          </>
        )}
      </nav>

      {/* Brand chips */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex flex-wrap gap-1.5">
          {BRANDS.map((b) => (
            <span key={b.name} className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: b.color + '30', color: b.color === '#4A5568' ? '#9CA3AF' : b.color, border: `1px solid ${b.color}50` }}>
              {b.name}
            </span>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="flex items-center gap-2.5 px-5 py-3.5 text-white/50 hover:text-white hover:bg-white/5 transition-colors border-t border-white/10 text-xs font-medium">
        <LogOut className="h-3.5 w-3.5" />
        Çıkış Yap
      </button>
    </aside>
  )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon
  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
  return (
    <Link href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all',
        isActive
          ? 'text-white'
          : 'text-white/55 hover:text-white/90 hover:bg-white/5'
      )}
      style={isActive ? { background: 'rgba(255,255,255,0.14)' } : {}}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
      {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
    </Link>
  )
}
