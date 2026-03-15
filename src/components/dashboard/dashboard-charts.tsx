'use client'

import { useState, useMemo } from 'react'
import { ContactHeatmap } from '@/components/charts/contact-heatmap'
import { ChannelChart } from '@/components/charts/channel-chart'
import { StyledSelect } from '@/components/ui/styled-select'

type CustomerEntry = {
  id: string
  location_id?: string | null
  created_at: string
  source_channel_id?: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brand?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  source_channel?: any
  [key: string]: unknown
}

type LocationOption = { id: string; name: string }

type DatePeriod = 'all' | 'today' | 'week' | 'month' | 'last_month'

const DATE_PERIOD_OPTIONS = [
  { id: 'all',        label: 'Tümü' },
  { id: 'today',      label: 'Bugün' },
  { id: 'week',       label: 'Bu Hafta' },
  { id: 'month',      label: 'Bu Ay' },
  { id: 'last_month', label: 'Geçen Ay' },
]

function isInPeriod(dateStr: string, period: DatePeriod): boolean {
  if (period === 'all') return true
  const date = new Date(dateStr)
  const now = new Date()
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

interface DashboardChartsProps {
  customers: CustomerEntry[]
  locations: LocationOption[]
}

export function DashboardCharts({ customers, locations }: DashboardChartsProps) {
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('all')

  // Build brand groups dynamically
  const brandGroups = useMemo(() => {
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

  // Apply global filters
  const filtered = useMemo(() => {
    let list = customers
    if (selectedLocation !== 'all') list = list.filter(c => c.location_id === selectedLocation)
    if (selectedPeriod !== 'all') list = list.filter(c => isInPeriod(c.created_at, selectedPeriod))
    const activeBrand = brandGroups.find(g => g.key === selectedBrand) ?? brandGroups[0]
    if (activeBrand) list = list.filter(activeBrand.filter)
    return list
  }, [customers, selectedLocation, selectedPeriod, selectedBrand, brandGroups])

  return (
    <div className="space-y-4">
      {/* Global filter bar */}
      <div className="flex items-center gap-1.5 flex-wrap px-1">
        {/* Location buttons */}
        {locations.length > 0 && (
          <>
            <button
              onClick={() => setSelectedLocation('all')}
              className="h-7 px-3 rounded-full text-[11px] font-semibold transition-all border bg-transparent"
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
                className="h-7 px-3 rounded-full text-[11px] font-semibold transition-all border bg-transparent"
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
            className="h-7 px-3 rounded-full text-[11px] font-semibold transition-all border bg-transparent"
            style={selectedBrand === g.key
              ? { borderColor: g.color, color: g.color, backgroundColor: g.color + '18' }
              : { borderColor: '#E2E8F0', color: '#94A3B8' }}
          >
            {g.label}
          </button>
        ))}

        {/* Date period dropdown */}
        <span className="h-4 w-px bg-gray-200 mx-0.5 shrink-0" />
        <StyledSelect
          compact
          value={selectedPeriod}
          onChange={v => setSelectedPeriod(v as DatePeriod)}
          className="w-32"
          options={DATE_PERIOD_OPTIONS}
        />
      </div>

      {/* Charts — receive globally filtered customers, no internal filters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ContactHeatmap customers={filtered as never[]} />
        <ChannelChart customers={filtered} />
      </div>
    </div>
  )
}
