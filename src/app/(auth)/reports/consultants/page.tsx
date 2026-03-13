'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LabelList,
} from 'recharts'
import {
  TrendingUp, Users, CheckCircle, XCircle, Activity,
  Filter, CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5 opacity-80" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Location Filter Row ──────────────────────────────────────────────────────

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
      {[{ id: 'all', name: 'Tüm Şubeler' }, ...locations].map(loc => (
        <button
          key={loc.id}
          onClick={() => onChange(loc.id)}
          className={`h-6 px-2.5 rounded-full text-[10px] font-semibold transition-all border ${
            value === loc.id
              ? 'border-slate-400 bg-slate-100 text-slate-700'
              : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600'
          }`}
        >
          {loc.name}
        </button>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConsultantReportPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(true)
  const [stats, setStats] = useState<ConsultantStats[]>([])
  const [allReasons, setAllReasons] = useState<string[]>([])
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
        .select('id, consultant_id, is_won, is_lost, lost_reason, created_at, location_id')
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

        // Parse lost reasons
        const lostReasons: Record<string, number> = {}
        mine.filter(cu => cu.is_lost && cu.lost_reason).forEach(cu => {
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
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, locationFilter])

  // Seçili danışmana göre sebep dağılımı (Toplam = tümü topla)
  const reasonBarData = useMemo(() => {
    const filteredStats = selectedConsultantFilter === 'toplam'
      ? stats
      : stats.filter(s => s.id === selectedConsultantFilter)

    return allReasons.map((reason, i) => ({
      reason,
      shortReason: reason.length > 18 ? reason.slice(0, 18) + '…' : reason,
      count: filteredStats.reduce((sum, s) => sum + (s.lostReasons[reason] ?? 0), 0),
      color: REASON_COLORS[i % REASON_COLORS.length],
    })).filter(d => d.count > 0)
  }, [stats, allReasons, selectedConsultantFilter])

  const totalWon = stats.reduce((s, c) => s + c.won, 0)
  const totalLost = stats.reduce((s, c) => s + c.lost, 0)
  const totalAll = stats.reduce((s, c) => s + c.total, 0)
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

      {/* ── Location + Date filters ── */}
      <div className="-mt-4 mb-2">
        {locations.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {[{ id: 'all', name: 'Tüm Şubeler' }, ...locations].map(loc => (
              <button
                key={loc.id}
                onClick={() => setLocationFilter(loc.id)}
                className={`h-7 px-3 rounded-full text-xs font-medium transition-all border ${
                  locationFilter === loc.id
                    ? 'border-slate-400 bg-slate-100 text-slate-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="-mt-2 mb-2">
        <div className="flex items-center gap-1 flex-wrap">
          {DATE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDateMode(tab.key)}
              className={`h-7 px-3 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                dateMode === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.key === 'custom' && <CalendarDays className="h-3 w-3" />}
              {tab.label}
            </button>
          ))}
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
        <StatCard label="Toplam Temas" value={totalAll} icon={Users} color="bg-blue-50 text-blue-600" />
        <StatCard label="Satış Yapıldı" value={totalWon} sub={`%${avgRate.toFixed(1)} kapama`} icon={CheckCircle} color="bg-green-50 text-green-600" />
        <StatCard label="Kaçan Satış" value={totalLost} icon={XCircle} color="bg-red-50 text-red-600" />
        <StatCard label="Aktif Süreçler" value={totalAll - totalWon - totalLost} icon={Activity} color="bg-indigo-50 text-indigo-600" />
      </div>

      {/* ── Closing Rate Chart ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Satış Kapatma Oranı</h2>
            <p className="text-xs text-gray-400">Danışman bazında satış / toplam temas oranı</p>
          </div>
        </div>

        {stats.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Veri bulunamadı</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, stats.length * 52)}>
            <BarChart
              layout="vertical"
              data={stats}
              margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
              barCategoryGap="28%"
            >
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
              <Bar dataKey="closingRate" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {stats.map((s) => (
                  <Cell
                    key={s.id}
                    fill={s.closingRate >= 35 ? '#10B981' : s.closingRate >= 20 ? '#6366F1' : '#F59E0B'}
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

      {/* ── Sector Benchmark Reference ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Sektör Benchmark — Satış Kapatma Oranı</h2>
            <p className="text-xs text-gray-400">Otomotiv bayii sektörü ortalamaları (referans)</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Seviye</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Satış Kapatma Oranı</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Yorum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                {
                  level: 'Düşük',
                  range: '%10 – %20',
                  comment: 'Süreçte problem olabilir. Karşılama, ihtiyaç analizi veya takip zayıf olabilir.',
                  color: 'bg-amber-50 text-amber-700 border-amber-200',
                  dot: 'bg-amber-400',
                },
                {
                  level: 'Orta (Sektör Ortalaması)',
                  range: '%20 – %35',
                  comment: 'Sağlıklı ve kabul edilebilir performans. Çoğu bayi bu aralıkta çalışır.',
                  color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                  dot: 'bg-indigo-500',
                },
                {
                  level: 'Yüksek (Başarılı satış danışmanı)',
                  range: '%35 – %50+',
                  comment: 'Güçlü satış becerisi, iyi müşteri yönetimi ve doğru lead kalitesi.',
                  color: 'bg-green-50 text-green-700 border-green-200',
                  dot: 'bg-green-500',
                },
              ].map((row) => (
                <tr key={row.level} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                      <span className="font-semibold text-gray-800 text-sm">{row.level}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${row.color}`}>
                      {row.range}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-600 max-w-xs">{row.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Lost Reasons Chart ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Satış Yapılamama Kök Sebepleri</h2>
              <p className="text-xs text-gray-400">
                {selectedConsultantFilter === 'toplam' ? 'Tüm danışmanlar — toplam dağılım' : (stats.find(s => s.id === selectedConsultantFilter)?.name ?? '') + ' — sebep dağılımı'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <select
              value={selectedConsultantFilter}
              onChange={e => setSelectedConsultantFilter(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 bg-white text-xs px-3 pr-7 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
            >
              <option value="toplam">Toplam (Tüm Danışmanlar)</option>
              {stats.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
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
                <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={52}>
                  {reasonBarData.map((d, i) => (
                    <Cell key={d.reason} fill={REASON_COLORS[i % REASON_COLORS.length]} />
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

      {/* ── Consultant Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <h2 className="text-sm font-bold text-gray-900">Danışman Detay Tablosu</h2>
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
              {stats.map((s, i) => (
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
              {stats.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">Veri bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
