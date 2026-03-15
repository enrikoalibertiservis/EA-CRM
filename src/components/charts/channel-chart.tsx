'use client'

import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { type ChannelStats } from '@/lib/types/database'
import { Radio } from 'lucide-react'

// ─── Customer shape for internal filtering ───────────────────────────────────

type CustomerEntry = {
  location_id?: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brand?: any
  source_channel_id?: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  source_channel?: any
}

type LocationOption = { id: string; name: string }

// ─── Build ChannelStats from raw customers ───────────────────────────────────

function buildChannelStats(entries: CustomerEntry[]): ChannelStats[] {
  const map = new Map<string, { channel: ChannelStats['channel']; count: number }>()
  entries.forEach(c => {
    const ch = Array.isArray(c.source_channel) ? c.source_channel[0] : c.source_channel
    if (!ch?.id) return
    if (!map.has(ch.id)) {
      map.set(ch.id, { channel: { id: ch.id, name: ch.name, color: ch.color ?? '#6B7280', is_active: true, sort_order: 0, icon_name: null, company_id: '' }, count: 0 })
    }
    map.get(ch.id)!.count++
  })
  const total = entries.filter(c => {
    const ch = Array.isArray(c.source_channel) ? c.source_channel[0] : c.source_channel
    return !!ch?.id
  }).length || 1
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .map(e => ({ ...e, percentage: (e.count / total) * 100 }))
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ChannelChartProps {
  data?: ChannelStats[]
  customers?: CustomerEntry[]
  locations?: LocationOption[]
  title?: string
}

export function ChannelChart({ data, customers, locations, title = 'Temas Kanalları Dağılımı' }: ChannelChartProps) {
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedBrand, setSelectedBrand] = useState('all')

  // ── Build brand groups from customers ──────────────────────────────────────
  const brandGroups = useMemo(() => {
    if (!customers) return []
    const seenNames = new Set<string>()
    const alfaJeepNames = new Set<string>()
    customers.forEach(c => {
      const name: string = Array.isArray(c.brand) ? (c.brand[0]?.name ?? '') : (c.brand?.name ?? '')
      if (!name || name.toLowerCase().includes('ikinci')) return
      if (name.includes('Alfa') || name.includes('Jeep')) alfaJeepNames.add(name)
      else seenNames.add(name)
    })
    const groups: { key: string; label: string; color: string; filter: (c: CustomerEntry) => boolean }[] = [
      { key: 'all', label: 'Toplam', color: '#6366f1', filter: () => true },
    ]
    seenNames.forEach(name => {
      const sample = customers.find(c => {
        const n = Array.isArray(c.brand) ? c.brand[0]?.name : c.brand?.name
        return n === name
      })
      const color = (Array.isArray(sample?.brand) ? sample?.brand[0]?.color : sample?.brand?.color) ?? '#6B7280'
      groups.push({ key: name, label: name, color, filter: c => {
        const n = Array.isArray(c.brand) ? c.brand[0]?.name : c.brand?.name
        return n === name
      }})
    })
    if (alfaJeepNames.size > 0) {
      groups.push({ key: 'alfa-jeep', label: 'ARJ', color: '#dc2626', filter: c => {
        const n = Array.isArray(c.brand) ? c.brand[0]?.name : c.brand?.name
        return !!n && (n.includes('Alfa') || n.includes('Jeep'))
      }})
    }
    return groups
  }, [customers])

  // ── Filtered stats ─────────────────────────────────────────────────────────
  const chartData = useMemo<ChannelStats[]>(() => {
    if (!customers) return data ?? []
    let filtered = customers
    if (selectedLocation !== 'all') filtered = filtered.filter(c => c.location_id === selectedLocation)
    const activeBrand = brandGroups.find(g => g.key === selectedBrand) ?? brandGroups[0]
    if (activeBrand) filtered = filtered.filter(activeBrand.filter)
    return buildChannelStats(filtered)
  }, [customers, data, selectedLocation, selectedBrand, brandGroups])

  const maxCount = Math.max(...chartData.map(d => d.count), 1)
  const yAxisWidth = Math.min(200, Math.max(...chartData.map(d => d.channel.name.length * 7), 60) + 12)

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.04] p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
          <Radio className="h-4 w-4 text-violet-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-400">Kaynak kanal bazında müşteri dağılımı</p>
        </div>
      </div>

      {/* Filters — only when customers prop provided */}
      {customers && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap shrink-0">
          {/* Location buttons */}
          {locations && locations.length > 0 && (
            <>
              <button
                onClick={() => setSelectedLocation('all')}
                className="h-6 px-2.5 rounded-full text-[10px] font-semibold transition-all border bg-transparent"
                style={selectedLocation === 'all'
                  ? { borderColor: '#64748b', color: '#64748b', backgroundColor: '#64748b18' }
                  : { borderColor: '#E2E8F0', color: '#94A3B8' }}
              >
                Tüm Şubeler
              </button>
              {locations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc.id)}
                  className="h-6 px-2.5 rounded-full text-[10px] font-semibold transition-all border bg-transparent"
                  style={selectedLocation === loc.id
                    ? { borderColor: '#0ea5e9', color: '#0ea5e9', backgroundColor: '#0ea5e918' }
                    : { borderColor: '#E2E8F0', color: '#94A3B8' }}
                >
                  {loc.name}
                </button>
              ))}
              <span className="h-4 w-px bg-gray-200 mx-0.5 shrink-0" />
            </>
          )}

          {/* Brand buttons */}
          {brandGroups.map(g => (
            <button
              key={g.key}
              onClick={() => setSelectedBrand(g.key)}
              className="h-6 px-2.5 rounded-full text-[10px] font-semibold transition-all border bg-transparent"
              style={selectedBrand === g.key
                ? { borderColor: g.color, color: g.color, backgroundColor: g.color + '18' }
                : { borderColor: '#E2E8F0', color: '#94A3B8' }}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
          Henüz veri yok
        </div>
      ) : (
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 46)}>
            <BarChart
              layout="vertical"
              data={chartData.map(d => ({ name: d.channel.name, count: d.count, color: d.channel.color, pct: d.percentage }))}
              margin={{ top: 4, right: 55, left: 0, bottom: 4 }}
              barCategoryGap="30%"
            >
              <defs>
                {chartData.map((d, i) => (
                  <linearGradient key={i} id={`gradCh${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={d.channel.color} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={d.channel.color} stopOpacity={1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis
                type="number"
                allowDecimals={false}
                domain={[0, maxCount + 1]}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={yAxisWidth}
                tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload as { name: string; count: number; pct: number }
                  return (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-2.5 text-xs">
                      <p className="font-bold text-gray-900 mb-1">{d.name}</p>
                      <p className="text-gray-600">Adet: <span className="font-semibold text-gray-900">{d.count}</span></p>
                      <p className="text-gray-600">Oran: <span className="font-semibold text-gray-900">%{d.pct.toFixed(1)}</span></p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" radius={[0, 7, 7, 0]} maxBarSize={30}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={`url(#gradCh${i})`} />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
