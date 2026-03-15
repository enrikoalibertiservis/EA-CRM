'use client'

import { useState, useMemo } from 'react'
import { BarChart2 } from 'lucide-react'
import type { HeatmapCell } from '@/lib/types/database'
import { StyledSelect } from '@/components/ui/styled-select'

const DAYS     = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ']
const DAYS_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const HOURS    = Array.from({ length: 11 }, (_, i) => i + 8) // 08–18

type CustomerEntry = {
  brand_id: string
  location_id?: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brand?: any
  created_at: string
}

type LocationOption = {
  id: string
  name: string
}

type BrandGroup = {
  key: string
  label: string
  color: string
  filter: (c: CustomerEntry) => boolean
}

function buildHeatmap(entries: CustomerEntry[]) {
  const map = new Map<string, number>()
  entries.forEach(c => {
    const d = new Date(c.created_at)
    const key = `${(d.getDay() + 6) % 7}-${d.getHours()}`
    map.set(key, (map.get(key) ?? 0) + 1)
  })
  return map
}

export function ContactHeatmap({
  customers,
  data,
  title = 'Müşteri Kayıt Yoğunluğu',
  locations,
}: {
  customers?: CustomerEntry[]
  data?: HeatmapCell[]         // legacy prop — reports sayfaları için
  title?: string
  locations?: LocationOption[]
}) {
  // Legacy mode: data prop verilmişse eski heatmap render et
  if (data && !customers) return <LegacyHeatmap data={data} title={title} />

  const safeCustomers = customers ?? []
  const now = new Date()
  const todayIdx = (now.getDay() + 6) % 7
  const [selectedDay, setSelectedDay]       = useState(todayIdx)
  const [selectedBrand, setSelectedBrand]   = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')

  // Lokasyon filtrelenmiş müşteriler
  const locationFiltered = useMemo(() =>
    selectedLocation === 'all'
      ? safeCustomers
      : safeCustomers.filter(c => c.location_id === selectedLocation),
    [safeCustomers, selectedLocation]
  )

  // Build brand groups from location-filtered customer data
  const brandGroups: BrandGroup[] = useMemo(() => {
    const groups: BrandGroup[] = [
      { key: 'all', label: 'Toplam', color: '#6366f1', filter: () => true },
    ]

    const seenNames = new Set<string>()
    const alfaJeepNames = new Set<string>()

    locationFiltered.forEach(c => {
      const name = Array.isArray(c.brand) ? (c.brand[0]?.name ?? '') : (c.brand?.name ?? '')
      if (!name || name.toLowerCase().includes('ikinci')) return
      if (name.includes('Alfa') || name.includes('Jeep')) {
        alfaJeepNames.add(name)
      } else {
        seenNames.add(name)
      }
    })

    seenNames.forEach(name => {
      const sample = locationFiltered.find(c => {
        const n = Array.isArray(c.brand) ? c.brand[0]?.name : c.brand?.name
        return n === name
      })
      const color = (Array.isArray(sample?.brand) ? sample?.brand[0]?.color : sample?.brand?.color) ?? '#6B7280'
      groups.push({
        key: name,
        label: name,
        color,
        filter: c => {
          const n = Array.isArray(c.brand) ? c.brand[0]?.name : c.brand?.name
          return n === name
        },
      })
    })

    if (alfaJeepNames.size > 0) {
      groups.push({
        key: 'alfa-jeep',
        label: 'ARJ',
        color: '#dc2626',
        filter: c => {
          const n = Array.isArray(c.brand) ? c.brand[0]?.name : c.brand?.name
          return !!n && (n.includes('Alfa') || n.includes('Jeep'))
        },
      })
    }

    return groups
  }, [locationFiltered])

  const activeBrand = brandGroups.find(g => g.key === selectedBrand) ?? brandGroups[0]
  const filtered    = useMemo(() => locationFiltered.filter(activeBrand.filter), [locationFiltered, activeBrand])

  const heatmap = useMemo(() => buildHeatmap(filtered), [filtered])

  const dayData = useMemo(() =>
    HOURS.map(hour => ({ hour, count: heatmap.get(`${selectedDay}-${hour}`) ?? 0 })),
    [heatmap, selectedDay]
  )

  const maxCount = Math.max(...dayData.map(d => d.count), 1)
  const peakHour = dayData.reduce((best, cur) => cur.count > best.count ? cur : best, dayData[0])

  const getBarColor = (count: number, isPeak: boolean) => {
    if (count === 0) return '#E5E7EB'
    const c = activeBrand.color
    if (isPeak) return c
    const ratio = count / maxCount
    return ratio > 0.7 ? c + 'cc' : ratio > 0.4 ? c + '88' : c + '44'
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.04] p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
          <BarChart2 className="h-4 w-4 text-indigo-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Müşteri kayıt zamanı dağılımı</p>
        </div>
      </div>

      {/* Filters row: location + brand + day dropdown — all in one line */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap shrink-0">
        {/* Location buttons — shown only when locations prop provided */}
        {locations && locations.length > 0 && (
          <>
            <button
              onClick={() => setSelectedLocation('all')}
              className="h-6 px-2.5 rounded-full text-[10px] font-semibold transition-all border bg-transparent"
              style={selectedLocation === 'all'
                ? { borderColor: '#64748b', color: '#64748b', backgroundColor: '#64748b18' }
                : { borderColor: '#E2E8F0', color: '#94A3B8' }
              }
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
                  : { borderColor: '#E2E8F0', color: '#94A3B8' }
                }
              >
                {loc.name}
              </button>
            ))}
            <span className="h-4 w-px bg-gray-200 mx-0.5 shrink-0" />
          </>
        )}

        {/* Brand buttons — same style as location buttons */}
        {brandGroups.map(g => (
          <button
            key={g.key}
            onClick={() => setSelectedBrand(g.key)}
            className="h-6 px-2.5 rounded-full text-[10px] font-semibold transition-all border bg-transparent"
            style={selectedBrand === g.key
              ? { borderColor: g.color, color: g.color, backgroundColor: g.color + '18' }
              : { borderColor: '#E2E8F0', color: '#94A3B8' }
            }
          >
            {g.label}
          </button>
        ))}

        {/* Day dropdown */}
        <span className="h-4 w-px bg-gray-200 mx-0.5 shrink-0" />
        <StyledSelect
          compact
          value={String(selectedDay)}
          onChange={v => setSelectedDay(Number(v))}
          className="w-36"
          options={DAYS.map((day, idx) => {
            const total = Array.from({ length: 24 }, (_, h) => heatmap.get(`${idx}-${h}`) ?? 0).reduce((s, v) => s + v, 0)
            return { id: String(idx), label: `${DAYS_FULL[idx]}${total > 0 ? ` (${total})` : ''}` }
          })}
        />
      </div>

      {/* Bar chart */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="flex items-end gap-1 px-1" style={{ height: '100px' }}>
          {dayData.map(({ hour, count }) => {
            const MAX_BAR = 80
            const barHeight = count === 0 ? 3 : Math.max(Math.round((count / maxCount) * MAX_BAR), 12)
            const isPeak = count > 0 && count === peakHour.count
            return (
              <div key={hour} className="flex-1 flex flex-col items-center justify-end gap-0.5 group"
                title={`${DAYS_FULL[selectedDay]} ${String(hour).padStart(2, '0')}:00 → ${count} kayıt`}>
                {count > 0 && (
                  <span className="text-[9px] font-bold" style={{ color: activeBrand.color }}>
                    {count}
                  </span>
                )}
                <div className="w-full rounded-t-sm transition-all duration-300"
                  style={{ height: `${barHeight}px`, backgroundColor: getBarColor(count, isPeak) }} />
              </div>
            )
          })}
        </div>

        {/* Hour labels */}
        <div className="flex items-center gap-1 px-1 mt-1">
          {dayData.map(({ hour }) => (
            <div key={hour} className="flex-1 text-center text-[9px] text-gray-400 font-medium">
              {hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {dayData.every(d => d.count === 0) && (
          <div className="flex flex-col items-center justify-center py-4 gap-1">
            <p className="text-xs text-gray-400">Bu gün için kayıt yok</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 shrink-0">
        <span className="text-[10px] text-gray-400">Toplam: <strong className="text-gray-600">{filtered.length}</strong> müşteri</span>
        {peakHour.count > 0 && (
          <span className="text-[10px] font-medium flex items-center gap-1" style={{ color: activeBrand.color }}>
            <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ backgroundColor: activeBrand.color }} />
            {String(peakHour.hour).padStart(2, '0')}:00 en yoğun saat
          </span>
        )}
        <span className="text-[10px] text-gray-400">08:00 – 18:00</span>
      </div>
    </div>
  )
}

// ── Legacy heatmap (grid view) — used in reports pages ──────────────────────
const DISPLAY_HOURS = Array.from({ length: 11 }, (_, i) => i + 8)
const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function LegacyHeatmap({ data, title }: { data: HeatmapCell[]; title?: string }) {
  const visibleData = data.filter(d => d.hour >= 8 && d.hour <= 18)
  const maxCount    = Math.max(...visibleData.map(d => d.count), 1)
  const getCell     = (day: number, hour: number) => data.find(d => d.day === day && d.hour === hour)
  const getOpacity  = (count: number) => count === 0 ? 0.04 : 0.15 + (count / maxCount) * 0.85

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.04] p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title ?? 'İletişim Yoğunluğu'}</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">08:30 – 18:00 mesai saatleri</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span>Az</span>
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map(o => (
              <div key={o} className="h-3 w-3 rounded-sm" style={{ backgroundColor: `rgba(37,99,235,${o})` }} />
            ))}
          </div>
          <span>Çok</span>
        </div>
      </div>
      <div className="flex-1 w-full">
        <div className="flex items-center mb-1 w-full">
          <div className="w-9 shrink-0" />
          <div className="flex flex-1 gap-px">
            {DISPLAY_HOURS.map(h => (
              <div key={h} className="flex-1 text-center text-[9px] font-medium text-gray-500">
                {String(h).padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>
        {DAYS_TR.map((day, dayIdx) => (
          <div key={day} className="flex items-center gap-px mb-px w-full">
            <div className="w-9 shrink-0 text-[11px] text-gray-500 font-medium pr-1 text-right">{day}</div>
            <div className="flex flex-1 gap-px">
              {DISPLAY_HOURS.map(hour => {
                const count = getCell(dayIdx, hour)?.count ?? 0
                return (
                  <div key={hour} title={`${day} ${String(hour).padStart(2, '0')}:00 → ${count} temas`}
                    className="flex-1 h-7 rounded-sm cursor-pointer transition-all hover:brightness-90"
                    style={{ backgroundColor: `rgba(37,99,235,${getOpacity(count)})`, border: count > 0 ? '1px solid rgba(37,99,235,0.2)' : '1px solid #F3F4F6' }} />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
