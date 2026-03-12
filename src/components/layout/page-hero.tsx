'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeft, Users, UserPlus, BarChart3, TrendingUp,
  MapPin, Settings, UserCog, User,
  type LucideIcon,
} from 'lucide-react'

// ─── Page metadata map ────────────────────────────────────────────────────────

interface PageMeta {
  title: string
  subtitle: string
  color: string
  icon: LucideIcon
}

const EXACT: Record<string, PageMeta> = {
  '/customers': {
    title: 'Müşteriler',
    subtitle: 'Tüm müşteri kayıtları ve satış süreçleri',
    color: '#6366F1',
    icon: Users,
  },
  '/customers/new': {
    title: 'Yeni Müşteri',
    subtitle: 'Sisteme yeni müşteri kaydı oluştur',
    color: '#10B981',
    icon: UserPlus,
  },
  '/reports/main': {
    title: 'Merkez Raporu',
    subtitle: 'Detaylı satış ve temas performansı',
    color: '#F59E0B',
    icon: BarChart3,
  },
  '/reports/consultants': {
    title: 'Danışman Performansı',
    subtitle: 'Kapama oranları ve kök sebep analizi',
    color: '#10B981',
    icon: TrendingUp,
  },
  '/reports/bergama': {
    title: 'İncesu Otomotiv',
    subtitle: 'Uydu şube detaylı analizi',
    color: '#06B6D4',
    icon: MapPin,
  },
  '/settings': {
    title: 'Sistem Ayarları',
    subtitle: 'Parametrik veriler ve sistem konfigürasyonu',
    color: '#8B5CF6',
    icon: Settings,
  },
  '/settings/users': {
    title: 'Kullanıcı Yönetimi',
    subtitle: 'Sistem kullanıcıları ve rol tanımları',
    color: '#6366F1',
    icon: UserCog,
  },
  '/settings/users/new': {
    title: 'Yeni Kullanıcı',
    subtitle: 'Sisteme yeni kullanıcı ekle',
    color: '#14B8A6',
    icon: UserPlus,
  },
}

// Customer detail dynamic routes
const CUSTOMER_DETAIL: PageMeta = {
  title: 'Müşteri Detayı',
  subtitle: 'Satış süreci ve iletişim takibi',
  color: '#3B82F6',
  icon: User,
}

function resolveMeta(pathname: string): PageMeta | null {
  if (pathname === '/dashboard') return null // dashboard has its own hero
  if (EXACT[pathname]) return EXACT[pathname]
  if (pathname.startsWith('/customers/')) return CUSTOMER_DETAIL
  // fallback
  return { title: '', subtitle: '', color: '#6B7280', icon: Settings }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PageHero() {
  const pathname = usePathname()
  const router   = useRouter()
  const meta     = resolveMeta(pathname)

  if (!meta || !meta.title) return null

  const Icon = meta.icon
  const c    = meta.color
  const canGoBack = pathname !== '/customers' && pathname !== '/dashboard'

  return (
    <div
      className="relative mb-6 rounded-2xl overflow-hidden shadow-md"
      style={{
        background: `linear-gradient(135deg, ${c} 0%, ${c}cc 100%)`,
        boxShadow: `0 4px 24px ${c}50`,
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full pointer-events-none bg-white/10" />
      <div className="absolute -bottom-6 right-24 h-24 w-24 rounded-full pointer-events-none bg-black/10" />
      <div className="absolute top-1/2 right-1/3 h-12 w-12 rounded-full pointer-events-none bg-white/5" />

      {/* Content */}
      <div className="relative z-10 flex items-center gap-3 px-5 py-4">
        {/* Back button */}
        {canGoBack && (
          <button
            onClick={() => router.back()}
            title="Geri Dön"
            className="flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 bg-white/20 border border-white/30 hover:bg-white/30"
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
        )}

        {/* Page icon */}
        <div className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center bg-white/20 border border-white/30 shadow-sm">
          <Icon className="h-5 w-5 text-white" />
        </div>

        {/* Title */}
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-white leading-tight">{meta.title}</h1>
          <p className="text-xs mt-0.5 text-white/75">{meta.subtitle}</p>
        </div>
      </div>
    </div>
  )
}
