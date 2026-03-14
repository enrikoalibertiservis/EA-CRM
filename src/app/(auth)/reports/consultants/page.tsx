'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LabelList,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, Target, XCircle,
  Filter, CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContactHeatmap } from '@/components/charts/contact-heatmap'
import { ChannelChart } from '@/components/charts/channel-chart'

type DateMode = '' | 'today' | 'week' | 'month' | 'last_month' | 'custom'

const DATE_TABS: { key: DateMode; label: string }[] = [
  { key: '', label: 'Tümü' },
  { key: 'today', label: 'Bugün' },
  { key: 'week', label: 'Bu Hafta' },
  { key: 'month', label: 'Bu Ay' },
  { key: 'last_month', label: 'Geçen Ay' },
  { key: 'custom', label: 'Özel Tarih' },
]

function getDateRange(mode: DateMode, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date()
  if (mode === 'today') {
    const d = now.toISOString().split('T')[0]
    return { from: d, to: d }
  }
  if (mode === 'week') {
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
    return { from: weekAgo.toISOString().split('T')[0], to: '' }
  }
  if (mode === 'month') {
    const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1)
    return { from: monthAgo.toISOString().split('T')[0], to: '' }
  }
  if (mode === 'last_month') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return {
      from: first.toISOString().split('T')[0],
      to: last.toISOString().split('T')[0],
    }
  }
  if (mode === 'custom') {
    return { from: customFrom, to: customTo }
  }
  return { from: '', to: '' }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConsultantStats {
  id: string
  name: string
  total: number
  won: number
  lost: number
  active: number
  closingRate: number
  lostReasons: Record<string, number>
}

// ─── Colour palette for reasons ───────────────────────────────────────────────

const REASON_COLORS = [
  '#6366F1', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#EC4899', '#14B8A6', '#3B82F6',
]

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ClosingRateTooltip({ active, payload }: { active?: boolean; payload?: { payload: ConsultantStats }[] }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1 min-w-[160px]">
      <p className="font-bold text-gray-900 text-sm">{d.name}</p>
      <div className="flex justify-between gap-4"><span className="text-gray-500">Toplam Temas</span><span className="font-semibold">{d.total}</span></div>
      <div className="flex justify-between gap-4"><span className="text-green-600">Satış Yapıldı</span><span className="font-semibold text-green-700">{d.won}</span></div>
      <div className="flex justify-between gap-4"><span className="text-red-500">Kaçan Satış</span><span className="font-semibold text-red-600">{d.lost}</span></div>
      <div className="flex justify-between gap-4"><span className="text-blue-500">Aktif</span><span className="font-semibold text-blue-600">{d.active}</span></div>
      <div className="pt-1 border-t border-gray-100 flex justify-between gap-4">
        <span className="text-gray-700 font-semibold">Kapama Oranı</span>
        <span className="font-bold text-indigo-600">%{d.closingRate.toFixed(1)}</span>
      </div>
    </div>
  )
}

function ReasonsTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1 min-w-[200px]">
      <p className="font-bold text-gray-900 text-sm mb-2">{label}</p>
      {payload.filter(p => p.value > 0).map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
            <span className="text-gray-600 truncate max-w-[140px]">{p.name}</span>
          </div>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
      {total > 0 && <div className="pt-1 border-t border-gray-100 flex justify-between font-semibold"><span>Toplam</span><span>{total}</span></div>}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatTheme {
  bg: string; border: string; value: string; label: string; iconColor: string
}

function StatCard({ label, value, sub, icon: Icon, theme }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; theme: StatTheme
}) {
  return (
    <div className={`relative rounded-2xl border overflow-hidden px-5 py-4 ${theme.bg} ${theme.border}`}>
      <Icon className={`absolute right-3 top-1/2 -translate-y-1/2 h-16 w-16 pointer-events-none ${theme.iconColor} opacity-10`} />
      <div className="relative">
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${theme.label}`}>{label}</p>
        <p className={`text-4xl font-black leading-none ${theme.value}`}>{value}</p>
        {sub && <p className={`text-xs mt-1.5 ${theme.label} opacity-70`}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── Location Filter Row ──────────────────────────────────────────────────────

const LOCATION_PALETTE = [
  { active: 'bg-blue-500/25 text-blue-700 border-blue-400 shadow-sm shadow-blue-100', inactive: 'border-blue-200 bg-blue-50/70 text-blue-500 hover:bg-blue-100/80' },
  { active: 'bg-emerald-500/25 text-emerald-700 border-emerald-400 shadow-sm shadow-emerald-100', inactive: 'border-emerald-200 bg-emerald-50/70 text-emerald-600 hover:bg-emerald-100/80' },
  { active: 'bg-violet-500/25 text-violet-700 border-violet-400 shadow-sm shadow-violet-100', inactive: 'border-violet-200 bg-violet-50/70 text-violet-500 hover:bg-violet-100/80' },
  { active: 'bg-amber-500/25 text-amber-700 border-amber-400 shadow-sm shadow-amber-100', inactive: 'border-amber-200 bg-amber-50/70 text-amber-600 hover:bg-amber-100/80' },
]

function LocationFilterRow({
  locations,
  value,
  onChange,
}: {
  locations: { id: string; name: string }[]
  value: string
  onChange: (v: string) => void
}) {
  if (!locations.length) return null
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onChange('all')}
        className={`h-7 px-3 rounded-xl text-[10px] font-semibold transition-all border ${
          value === 'all'
            ? 'bg-slate-200/80 text-slate-700 border-slate-400 shadow-sm'
            : 'border-slate-200 bg-slate-50/80 text-slate-500 hover:bg-slate-100'
        }`}
      >
        Tüm Şubeler
      </button>
      {locations.map((loc, idx) => {
        const colors = LOCATION_PALETTE[idx % LOCATION_PALETTE.length]
        return (
          <button
            key={loc.id}
            onClick={() => onChange(loc.id)}
            className={`h-7 px-3 rounded-xl text-[10px] font-semibold transition-all border ${
              value === loc.id ? colors.active : colors.inactive
            }`}
          >
            {loc.name}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConsultantReportPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(true)
  const [stats, setStats] = useState<ConsultantStats[]>([])
  const [allReasons, setAllReasons] = useState<string[]>([])
  type RawCustomer = {
    lost_reason: string | null
    consultant_id: string | null
    location_id: string | null
    source_channel_id?: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    source_channel?: { id: string; name: string; slug: string; icon_name: string; color: string } | any
    brand_id?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    brand?: any
    created_at: string
    is_won?: boolean
    is_lost?: boolean
  }
  const [allCustomerList, setAllCustomerList] = useState<RawCustomer[]>([])
  const [heatmapCustomers, setHeatmapCustomers] = useState<{ brand_id: string; location_id?: string | null; brand?: { name: string; color: string }; created_at: string }[]>([])
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([])
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [dateMode, setDateMode] = useState<DateMode>('')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedConsultantFilter, setSelectedConsultantFilter] = useState<string>('toplam')

  const { from: dateFrom, to: dateTo } = getDateRange(dateMode, customFrom, customTo)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAuthorized(false); return }
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
      if (!['super_admin', 'manager'].includes(profile?.role ?? '')) { setAuthorized(false); return }

      // Fetch locations
      const { data: locData } = await supabase.from('locations').select('id, name').order('name')
      setLocations(locData ?? [])

      // Fetch lost reasons for filter
      const { data: lrData } = await supabase.from('lost_reasons').select('name').eq('is_active', true).order('sort_order')
      const reasonNames = (lrData ?? []).map((r: { name: string }) => r.name)
      setAllReasons(reasonNames)

      // Fetch consultants
      const { data: consultants } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('role', ['consultant', 'manager'])
        .eq('is_active', true)

      // Fetch customers with date range
      let query = supabase
        .from('customers')
        .select('id, consultant_id, is_won, is_lost, lost_reason, created_at, location_id, brand_id, brand:brands(name, color), source_channel_id, source_channel:contact_channels(id, name, slug, icon_name, color)')
        .eq('is_active', true)
      if (dateFrom) query = query.gte('created_at', dateFrom)
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59')

      const { data: customers } = await query

      // Build stats per consultant
      const consultantList = consultants ?? []
      const customerList = (customers ?? []).filter(cu =>
        locationFilter === 'all' || cu.location_id === locationFilter
      )

      const statsArr: ConsultantStats[] = consultantList.map(c => {
        const mine = customerList.filter(cu => cu.consultant_id === c.id)
        const won = mine.filter(cu => cu.is_won).length
        const lost = mine.filter(cu => cu.is_lost).length
        const total = mine.length
        const active = total - won - lost

        // Parse lost reasons — is_lost bayrağı beklenmez, lost_reason alanı yeterli
        const lostReasons: Record<string, number> = {}
        mine.filter(cu => cu.lost_reason).forEach(cu => {
          const lines = (cu.lost_reason as string).split('\n')
          lines.forEach(line => {
            const trimmed = line.replace(/^Not: /, '').trim()
            if (trimmed && !trimmed.startsWith('Not:')) {
              lostReasons[trimmed] = (lostReasons[trimmed] ?? 0) + 1
            }
          })
        })

        return {
          id: c.id,
          name: c.full_name,
          total,
          won,
          lost,
          active,
          closingRate: total > 0 ? (won / total) * 100 : 0,
          lostReasons,
        }
      }).filter(s => s.total > 0).sort((a, b) => b.closingRate - a.closingRate)

      setStats(statsArr)
      setAllCustomerList(customerList)
      // Heatmap için tüm müşteriler (konum filtresi yok — heatmap kendi içinde filtreler)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHeatmapCustomers((customers ?? []) as any)
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, locationFilter])

  // Danışman filtresi — tüm sayfaya uygulanır
  const filteredStats = useMemo(() => {
    if (selectedConsultantFilter === 'toplam') return stats
    return stats.filter(s => s.id === selectedConsultantFilter)
  }, [stats, selectedConsultantFilter])

  // Kök sebepler — "Tüm Danışmanlar" seçiliyken tüm müşterilerden topla (danışmansız dahil)
  const reasonBarData = useMemo(() => {
    const reasonCounts: Record<string, number> = {}

    const parseLostReason = (lostReason: string) => {
      lostReason.split('\n').forEach(line => {
        const trimmed = line.replace(/^Not: /, '').trim()
        if (trimmed && !trimmed.startsWith('Not:')) {
          reasonCounts[trimmed] = (reasonCounts[trimmed] ?? 0) + 1
        }
      })
    }

    if (selectedConsultantFilter === 'toplam') {
      // Tüm müşterileri tara — danışmana atanmamış olanlar da dahil
      allCustomerList.filter(cu => cu.lost_reason).forEach(cu => {
        parseLostReason(cu.lost_reason as string)
      })
    } else {
      // Seçili danışmanın kayıpları
      filteredStats.forEach(s => {
        Object.entries(s.lostReasons).forEach(([reason, count]) => {
          reasonCounts[reason] = (reasonCounts[reason] ?? 0) + count
        })
      })
    }

    return Object.entries(reasonCounts)
      .map(([reason, count], i) => ({
        reason,
        shortReason: reason.length > 20 ? reason.slice(0, 20) + '…' : reason,
        count,
        color: REASON_COLORS[i % REASON_COLORS.length],
      }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [filteredStats, allCustomerList, selectedConsultantFilter])

  // Temas kanalları dağılımı
  const channelStats = useMemo(() => {
    const source = selectedConsultantFilter === 'toplam'
      ? allCustomerList
      : allCustomerList.filter(cu => cu.consultant_id === selectedConsultantFilter)

    const counts: Record<string, { channel: { id: string; name: string; slug: string; icon_name: string; color: string }; count: number }> = {}
    source.forEach(cu => {
      const ch = cu.source_channel
      if (!ch || !ch.id) return
      if (!counts[ch.id]) counts[ch.id] = { channel: ch, count: 0 }
      counts[ch.id].count++
    })

    const arr = Object.values(counts).filter(x => x.count > 0)
    const total = arr.reduce((s, x) => s + x.count, 0)
    return arr
      .map(x => ({ ...x, percentage: total > 0 ? (x.count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count)
  }, [allCustomerList, selectedConsultantFilter])

  const totalWon = filteredStats.reduce((s, c) => s + c.won, 0)
  const totalLost = filteredStats.reduce((s, c) => s + c.lost, 0)
  const totalAll = filteredStats.reduce((s, c) => s + c.total, 0)
  const avgRate = totalAll > 0 ? (totalWon / totalAll * 100) : 0

  if (!authorized) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <p>Bu sayfaya erişim yetkiniz yok.</p>
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

  return (
    <div className="space-y-7">

      {/* ── Date filters + Location filter + Consultant filter ── */}
      <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {DATE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setDateMode(tab.key)}
                className={`h-9 px-4 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                  dateMode === tab.key
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                    : 'bg-blue-50/60 border-blue-100 text-blue-500 hover:bg-blue-100/70'
                }`}
              >
                {tab.key === 'custom' && <CalendarDays className="h-3 w-3" />}
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <LocationFilterRow locations={locations} value={locationFilter} onChange={setLocationFilter} />
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <select
                value={selectedConsultantFilter}
                onChange={e => setSelectedConsultantFilter(e.target.value)}
                className="h-9 rounded-xl border border-gray-200 bg-gray-50 text-xs px-3 pr-7 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
              >
                <option value="toplam">Tüm Danışmanlar</option>
                {stats.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Custom date range picker */}
        {dateMode === 'custom' && (
          <div className="flex items-center gap-3 mt-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
            <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <div>
                <label className="text-xs font-medium text-blue-700 block mb-0.5">Başlangıç</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="h-8 rounded-lg border border-blue-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                />
              </div>
              <span className="text-blue-400 font-bold mt-4">—</span>
              <div>
                <label className="text-xs font-medium text-blue-700 block mb-0.5">Bitiş</label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={e => setCustomTo(e.target.value)}
                  className="h-8 rounded-lg border border-blue-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                />
              </div>
              {(customFrom || customTo) && (
                <button
                  onClick={() => { setCustomFrom(''); setCustomTo('') }}
                  className="mt-4 text-xs text-blue-500 hover:text-blue-700 underline"
                >
                  Temizle
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Temas"
          value={totalAll}
          icon={Users}
          theme={{ bg: 'bg-gradient-to-br from-sky-50 to-blue-100/60', border: 'border-blue-200/70', value: 'text-blue-700', label: 'text-blue-500', iconColor: 'text-blue-600' }}
        />
        <StatCard
          label="Satış Yapıldı"
          value={totalWon}
          icon={TrendingUp}
          theme={{ bg: 'bg-gradient-to-br from-emerald-50 to-green-100/60', border: 'border-emerald-200/70', value: 'text-emerald-700', label: 'text-emerald-600', iconColor: 'text-emerald-600' }}
        />
        <StatCard
          label="Kaçan Satış"
          value={totalLost}
          icon={TrendingDown}
          theme={{ bg: 'bg-gradient-to-br from-red-50 to-rose-100/60', border: 'border-red-200/70', value: 'text-red-600', label: 'text-red-500', iconColor: 'text-red-500' }}
        />
        <StatCard
          label="Satış Kapatma Oranı"
          value={`%${avgRate.toFixed(1)}`}
          sub={`${totalAll} temasta ${totalWon} satış`}
          icon={Target}
          theme={{ bg: 'bg-gradient-to-br from-violet-50 to-indigo-100/60', border: 'border-indigo-200/70', value: 'text-indigo-700', label: 'text-indigo-500', iconColor: 'text-indigo-600' }}
        />
      </div>

      {/* ── Closing Rate Chart + Heatmap (50/50) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

      {/* Closing Rate */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Satış Kapatma Oranı</h2>
              <p className="text-xs text-gray-400">Danışman bazında satış / toplam temas oranı</p>
            </div>
          </div>
        </div>

        {filteredStats.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Veri bulunamadı</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, filteredStats.length * 52)}>
            <BarChart
              layout="vertical"
              data={filteredStats}
              margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
              barCategoryGap="28%"
            >
              <defs>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="gradIndigo" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a5b4fc" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
                <linearGradient id="gradAmber" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={v => `%${v}`}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ClosingRateTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="closingRate" radius={[0, 7, 7, 0]} maxBarSize={30}>
                {filteredStats.map((s) => (
                  <Cell
                    key={s.id}
                    fill={s.closingRate >= 35 ? 'url(#gradGreen)' : s.closingRate >= 20 ? 'url(#gradIndigo)' : 'url(#gradAmber)'}
                  />
                ))}
                <LabelList
                  dataKey="closingRate"
                  position="right"
                  formatter={(v: unknown) => `%${(v as number).toFixed(1)}`}
                  style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 justify-center text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-green-500" />≥ %35 Yüksek</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" />%20–34 Orta</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />{'<'} %20 Düşük</span>
        </div>
      </div>

      {/* Heatmap */}
      <ContactHeatmap
        customers={heatmapCustomers}
        locations={locations}
        title="Müşteri Kayıt Yoğunluğu"
      />

      </div>{/* end 50/50 grid */}


      {/* ── Lost Reasons Chart + Channel Chart (50/50) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">

      {/* Lost Reasons */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <XCircle className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Satış Yapılamama Kök Sebepleri</h2>
              <p className="text-xs text-gray-400">
                {selectedConsultantFilter === 'toplam' ? 'Tüm danışmanlar — toplam dağılım' : (stats.find(s => s.id === selectedConsultantFilter)?.name ?? '') + ' — sebep dağılımı'}
              </p>
            </div>
          </div>
        </div>

        {reasonBarData.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Kayıp verisi bulunamadı</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(260, reasonBarData.length * 44 + 80)}>
              <BarChart
                data={reasonBarData}
                margin={{ top: 8, right: 40, left: 0, bottom: 70 }}
                barCategoryGap="25%"
              >
                <defs>
                  {REASON_COLORS.map((color, i) => (
                    <linearGradient key={i} id={`gradReason${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={1} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.45} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="shortReason"
                  tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const d = payload[0].payload as { reason: string; count: number }
                    return (
                      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-2.5 text-xs">
                        <p className="font-bold text-gray-900 mb-1">{d.reason}</p>
                        <p className="text-gray-600">Adet: <span className="font-semibold text-gray-900">{d.count}</span></p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={52}>
                  {reasonBarData.map((d, i) => (
                    <Cell key={d.reason} fill={`url(#gradReason${i % REASON_COLORS.length})`} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Renk legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
              {reasonBarData.map((d, i) => (
                <span key={d.reason} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: REASON_COLORS[i % REASON_COLORS.length] }} />
                  {d.reason}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Channel Chart */}
      <ChannelChart
        data={channelStats as import('@/lib/types/database').ChannelStats[]}
        title="Temas Kanalları Dağılımı"
      />

      </div>{/* end 50/50 grid */}

      {/* ── Consultant Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Danışman Detay Tablosu</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="text-left px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Danışman</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Toplam</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-green-400 uppercase tracking-wide">Satış</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-red-400 uppercase tracking-wide">Kayıp</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-blue-400 uppercase tracking-wide">Takip</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-indigo-400 uppercase tracking-wide">Kapama %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStats.map((s, i) => (
                <tr key={s.id} className={`transition-colors hover:bg-blue-50/30 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                        {s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span className="font-medium text-gray-900">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center font-medium text-gray-700">{s.total}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center justify-center h-7 min-w-[32px] px-2.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">{s.won}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center justify-center h-7 min-w-[32px] px-2.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">{s.lost}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center justify-center h-7 min-w-[32px] px-2.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{s.active}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(s.closingRate, 100)}%`,
                            backgroundColor: s.closingRate >= 35 ? '#10B981' : s.closingRate >= 20 ? '#6366F1' : '#F59E0B',
                          }}
                        />
                      </div>
                      <span className={cn(
                        'text-xs font-bold w-10 text-right',
                        s.closingRate >= 35 ? 'text-green-600' : s.closingRate >= 20 ? 'text-indigo-600' : 'text-amber-600',
                      )}>
                        %{s.closingRate.toFixed(1)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStats.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">Veri bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
