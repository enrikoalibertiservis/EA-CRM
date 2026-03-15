'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Users, MessageSquare, CheckCircle, Clock, UserPlus } from 'lucide-react'
import { BrandFunnel } from '@/components/charts/brand-funnel'
import { ContactHeatmap } from '@/components/charts/contact-heatmap'
import { ChannelChart } from '@/components/charts/channel-chart'
import { QuickRegister } from '@/components/customers/quick-register'
import { StyledSelect } from '@/components/ui/styled-select'

// ─── Types ────────────────────────────────────────────────────────────────────

type DatePeriod = 'all' | 'today' | 'week' | 'month' | 'last_month'

const DATE_PERIOD_OPTIONS = [
  { id: 'all',        label: 'Tümü' },
  { id: 'today',      label: 'Bugün' },
  { id: 'week',       label: 'Bu Hafta' },
  { id: 'month',      label: 'Bu Ay' },
  { id: 'last_month', label: 'Geçen Ay' },
]

const BRAND_OPTIONS = [
  { id: 'all',  label: 'Tüm Markalar' },
  { id: 'fiat', label: 'Fiat' },
  { id: 'arj',  label: 'ARJ (Alfa + Jeep)' },
]

function isInPeriod(dateStr: string, period: DatePeriod): boolean {
  if (period === 'all') return true
  const date = new Date(dateStr)
  const now  = new Date()
  if (period === 'today') {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  }
  if (period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); start.setHours(0, 0, 0, 0)
    return date >= start
  }
  if (period === 'month') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  if (period === 'last_month') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return date.getFullYear() === lm.getFullYear() && date.getMonth() === lm.getMonth()
  }
  return true
}

function brandMatch(customer: RawCustomer, brand: 'all' | 'fiat' | 'arj'): boolean {
  if (brand === 'all') return true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const name: string = (Array.isArray((customer as any).brand) ? (customer as any).brand[0]?.name : (customer as any).brand?.name) ?? ''
  if (brand === 'fiat') return name.toLowerCase().includes('fiat')
  return name.toLowerCase().includes('alfa') || name.toLowerCase().includes('jeep')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawCustomer = any

interface DashboardClientProps {
  customers:        RawCustomer[]
  contactLogs:      { id: string; contact_date: string }[]
  locations:        { id: string; name: string }[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brands:           any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stages:           any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  models:           any[]
  firstName:        string
  today:            string
  roleLabel:        string
  currentUserId:    string
  currentLocationId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardClient({
  customers, contactLogs, locations, brands, stages, models,
  firstName, today, roleLabel, currentUserId, currentLocationId,
}: DashboardClientProps) {
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedBrand,    setSelectedBrand]    = useState<'all' | 'fiat' | 'arj'>('all')
  const [selectedPeriod,   setSelectedPeriod]   = useState<DatePeriod>('all')

  // ── Filtered customers ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = customers
    if (selectedLocation !== 'all') list = list.filter(c => c.location_id === selectedLocation)
    if (selectedPeriod   !== 'all') list = list.filter(c => isInPeriod(c.created_at, selectedPeriod))
    if (selectedBrand    !== 'all') list = list.filter(c => brandMatch(c, selectedBrand))
    return list
  }, [customers, selectedLocation, selectedPeriod, selectedBrand])

  // ── Stat counts ──────────────────────────────────────────────────────────
  const totalCustomers  = filtered.length
  const activeCustomers = filtered.filter(c => !c.is_won && !c.is_lost).length
  const wonCustomers    = filtered.filter(c => c.is_won).length
  const totalContacts   = useMemo(() => {
    if (selectedPeriod === 'all') return contactLogs.length
    return contactLogs.filter(l => isInPeriod(l.contact_date, selectedPeriod)).length
  }, [contactLogs, selectedPeriod])

  // ── Brand funnel data ────────────────────────────────────────────────────
  const brandFunnelData = useMemo(() => {
    return brands
      .filter(b => b.slug !== 'ikinci-el' && !b.name.toLowerCase().includes('ikinci'))
      .filter(b => {
        if (selectedBrand === 'all') return true
        if (selectedBrand === 'fiat') return b.name.toLowerCase().includes('fiat')
        return b.name.toLowerCase().includes('alfa') || b.name.toLowerCase().includes('jeep')
      })
      .map(brand => {
        const bc = filtered.filter(c => c.brand_id === brand.id)
        return {
          brand,
          stages: stages.map(stage => ({ stage, count: bc.filter(c => c.current_stage_id === stage.id).length })),
          total: bc.length,
          won:   bc.filter(c => c.is_won).length,
          lost:  bc.filter(c => c.is_lost).length,
        }
      })
  }, [brands, stages, filtered, selectedBrand])

  const statCards = [
    { label: 'MÜŞTERİLER', value: totalCustomers,  sub: 'toplam müşteri',    icon: Users,         color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100',   dot: 'bg-blue-500' },
    { label: 'AKTİF TAKİP', value: activeCustomers, sub: 'devam ediyor',     icon: Clock,         color: 'text-teal-600',   bg: 'bg-teal-50',   border: 'border-teal-100',   dot: 'bg-teal-500' },
    { label: 'KAZANILAN',   value: wonCustomers,    sub: 'satış tamamlandı', icon: CheckCircle,   color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100',  dot: 'bg-amber-500' },
    { label: 'TEMAS',       value: totalContacts,   sub: 'toplam temas',     icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', dot: 'bg-violet-500' },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 px-6 py-8 text-white shadow-lg min-h-[110px]">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 right-20 w-28 h-28 rounded-full bg-indigo-800/30" />
        <div className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full bg-white/5" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">{today}</p>
            <h1 className="text-2xl font-bold">Hoş Geldiniz, {firstName} 👋</h1>
            <p className="text-blue-200 text-sm mt-1">{roleLabel}</p>
          </div>
          <Link href="/customers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-gray-900 shadow-lg shadow-amber-500/50 hover:bg-amber-300 hover:scale-105 transition-all text-sm">
            <UserPlus className="h-4 w-4" />
            Yeni Müşteri
          </Link>
        </div>
      </div>

      {/* ── Global Filter Bar ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">

          {/* Date period buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {DATE_PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSelectedPeriod(opt.id as DatePeriod)}
                className={`h-9 px-4 rounded-xl text-xs font-semibold transition-all border ${
                  selectedPeriod === opt.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                    : 'bg-blue-50/60 border-blue-100 text-blue-500 hover:bg-blue-100/70'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Right side: şube + marka dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {locations.length > 0 && (
              <StyledSelect
                value={selectedLocation === 'all' ? '' : selectedLocation}
                onChange={v => setSelectedLocation(v || 'all')}
                placeholder="Tüm Şubeler"
                className="w-40"
                options={locations.map(l => ({ id: l.id, label: l.name }))}
              />
            )}
            <StyledSelect
              value={selectedBrand === 'all' ? '' : selectedBrand}
              onChange={v => setSelectedBrand((v || 'all') as 'all' | 'fiat' | 'arj')}
              placeholder="Tüm Markalar"
              className="w-40"
              options={BRAND_OPTIONS.filter(o => o.id !== 'all')}
            />
          </div>

        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`flex items-center gap-4 rounded-xl border ${s.border} ${s.bg} px-4 py-3.5 shadow-sm`}>
              <div className={`rounded-lg bg-white/80 p-2.5 shadow-sm ${s.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold leading-tight text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
              </div>
              <div className="flex flex-col gap-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`w-1.5 rounded-full opacity-30 ${s.dot}`} style={{ height: `${8 + i * 4}px` }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Quick Register + Brand Funnels ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
        <QuickRegister
          brands={brands.filter(b => b.slug !== 'ikinci-el' && !b.name.toLowerCase().includes('ikinci'))}
          models={models}
          locations={locations}
          currentUserId={currentUserId}
          currentLocationId={currentLocationId}
        />
        {brandFunnelData.map(d => <BrandFunnel key={d.brand.id} data={d} />)}
      </div>

      {/* ── Heatmap + Channel Chart ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ContactHeatmap customers={filtered as never[]} hideFilters />
        <ChannelChart   customers={filtered}            hideFilters />
      </div>

    </div>
  )
}
