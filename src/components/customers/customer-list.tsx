'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Search, Filter, ChevronRight, Car, FileText, Clock,
  CheckCircle, Shield, Lock, X, Trash2, CalendarDays, AlertTriangle,
  ChevronUp, ChevronDown, ChevronsUpDown, Building2, Check, ChevronDown as ChevDown, UserPlus,
  FileDown,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Customer } from '@/lib/types/database'
import { StyledSelect } from '@/components/ui/styled-select'

// ─── Custom Multi-Select Dropdown ────────────────────────────────────────────

interface SelectOption { id: string; label: string; color?: string }

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  accentColor = '#3B82F6',
}: {
  label: string
  options: SelectOption[]
  selected: string[]
  onChange: (vals: string[]) => void
  accentColor?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(v => v !== id) : [...selected, id])
  }

  const selLabels = options.filter(o => selected.includes(o.id)).map(o => o.label)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 h-9 px-3 rounded-xl border text-xs font-medium transition-all bg-white shadow-sm hover:shadow ${
          selected.length > 0
            ? 'border-blue-300 bg-blue-50/60 text-blue-700'
            : 'border-gray-200 text-gray-500 hover:border-gray-300'
        }`}
      >
        <span className="truncate">
          {selected.length === 0
            ? label
            : selected.length === 1
              ? selLabels[0]
              : `${label} (${selected.length})`}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selected.length > 0 && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange([]) }}
              className="h-4 w-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center hover:bg-blue-300 cursor-pointer"
            >
              <X className="h-2.5 w-2.5" />
            </span>
          )}
          <ChevDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto py-1">
            {options.map(opt => {
              const isSelected = selected.includes(opt.id)
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left ${
                    isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                  </div>
                  {opt.color && (
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                  )}
                  <span className="flex-1 truncate font-medium">{opt.label}</span>
                </button>
              )
            })}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-1.5">
              <button
                type="button"
                onClick={() => { onChange([]); setOpen(false) }}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Seçimi temizle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const stageIcons: Record<string, React.ElementType> = {
  'arac-tanitimi': Car, 'teklif': FileText, 'dusunme': Clock,
  'kabul': CheckCircle, 'sigorta': Shield, 'oto-koruma': Lock,
}

const PAGE_SIZE = 20

const LOCATION_PALETTE = [
  { bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.30)',  color: '#4338CA' },  // indigo
  { bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.30)',  color: '#047857' },  // emerald
  { bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.30)',  color: '#B45309' },  // amber
  { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.30)',   color: '#B91C1C' },  // red
  { bg: 'rgba(6,182,212,0.10)',   border: 'rgba(6,182,212,0.30)',   color: '#0E7490' },  // cyan
]

interface CustomerListProps {
  customers: Customer[]
  brands: { id: string; name: string; color: string; slug: string }[]
  stages: { id: string; name: string; color: string; slug: string; sort_order: number }[]
  consultants: { id: string; full_name: string }[]
  locations: { id: string; name: string }[]
  channels: { id: string; name: string; color: string }[]
  contactTypes: { id: string; name: string; slug: string; color: string }[]
  userRole: string
}

type SortField = 'created_at' | 'full_name' | 'brand' | 'consultant' | 'status'
type SortDir = 'asc' | 'desc'
type DateMode = '' | 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'custom'

const DATE_TABS: { key: DateMode; label: string }[] = [
  { key: '', label: 'Tümü' },
  { key: 'today', label: 'Bugün' },
  { key: 'yesterday', label: 'Dün' },
  { key: 'week', label: 'Bu Hafta' },
  { key: 'month', label: 'Bu Ay' },
  { key: 'last_month', label: 'Geçen Ay' },
  { key: 'custom', label: 'Özel Tarih' },
]

const CAN_DELETE  = ['super_admin', 'manager']
const CAN_EXPORT  = ['super_admin', 'manager']

export function CustomerList({ customers, brands, stages, consultants, locations, channels, contactTypes, userRole }: CustomerListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterBrands, setFilterBrands] = useState<string[]>([])
  const [filterStages, setFilterStages] = useState<string[]>([])
  const [filterConsultants, setFilterConsultants] = useState<string[]>([])
  const [filterChannels, setFilterChannels] = useState<string[]>([])
  const [filterContactTypes, setFilterContactTypes] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate] = useState<DateMode>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showFilters, setShowFilters] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [page, setPage] = useState(1)

  const canDelete  = CAN_DELETE.includes(userRole)
  const canExport  = CAN_EXPORT.includes(userRole)

  const exportToCSV = () => {
    if (!canExport) return
    const BOM = '\uFEFF'
    const headers = ['#', 'Ad Soyad', 'Telefon', 'Marka', 'İlgilendiği Model', 'Durum', 'Aşama', 'Danışman', 'Şube', 'Nereden Ulaştı?', 'Kayıt Tarihi']
    const rows = filtered.map((c, idx) => {
      const HIDDEN = ['sigorta', 'oto-koruma']
      const displaySt = c.current_stage && HIDDEN.includes(c.current_stage.slug ?? '')
        ? stages.find(s => s.slug === 'kabul') ?? c.current_stage
        : c.current_stage
      const durum = c.is_won ? 'Satış Yapıldı' : c.is_lost ? 'Kaçan Satış' : (displaySt?.name ?? '—')
      const channel = channels.find(ch => ch.id === c.source_channel_id)?.name ?? '—'
      const tarih = new Date(c.created_at).toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
      return [
        idx + 1,
        c.full_name,
        c.phone,
        c.brand?.name ?? '—',
        c.interested_model ?? '—',
        durum,
        c.current_stage?.name ?? '—',
        c.consultant?.full_name ?? '—',
        c.location?.name ?? '—',
        channel,
        tarih,
      ]
    })
    const csv = BOM + [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `musteriler_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetPage = () => setPage(1)

  const filtered = useMemo(() => {
    let list = [...customers]
    const now = new Date()

    if (filterLocation) list = list.filter(c => c.location_id === filterLocation)
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(c =>
        c.full_name.toLowerCase().includes(s) || c.phone.includes(s) ||
        c.email?.toLowerCase().includes(s) || c.interested_model?.toLowerCase().includes(s)
      )
    }
    if (filterBrands.length > 0) list = list.filter(c => filterBrands.includes(c.brand_id ?? ''))
    if (filterStages.length > 0) list = list.filter(c => filterStages.includes(c.current_stage_id ?? ''))
    if (filterConsultants.length > 0) list = list.filter(c => filterConsultants.includes(c.consultant_id ?? ''))
    if (filterChannels.length > 0) list = list.filter(c => filterChannels.includes(c.source_channel_id ?? ''))
    if (filterContactTypes.length > 0) list = list.filter(c => filterContactTypes.includes(c.initial_contact_type ?? ''))
    if (filterStatus === 'active') list = list.filter(c => !c.is_won && !c.is_lost)
    if (filterStatus === 'won') list = list.filter(c => c.is_won)
    if (filterStatus === 'lost') list = list.filter(c => c.is_lost)

    if (filterDate === 'today') {
      const todayStr = now.toISOString().split('T')[0]
      list = list.filter(c => c.created_at.startsWith(todayStr))
    } else if (filterDate === 'yesterday') {
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      list = list.filter(c => c.created_at.startsWith(yesterdayStr))
    } else if (filterDate === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
      list = list.filter(c => new Date(c.created_at) >= weekAgo)
    } else if (filterDate === 'month') {
      const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1)
      list = list.filter(c => new Date(c.created_at) >= monthAgo)
    } else if (filterDate === 'last_month') {
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      list = list.filter(c => {
        const d = new Date(c.created_at)
        return d >= firstOfLastMonth && d <= lastOfLastMonth
      })
    } else if (filterDate === 'custom') {
      if (dateFrom) list = list.filter(c => c.created_at >= dateFrom)
      if (dateTo) list = list.filter(c => c.created_at <= dateTo + 'T23:59:59')
    }

    list.sort((a, b) => {
      let aVal = '', bVal = ''
      if (sortField === 'created_at') { aVal = a.created_at; bVal = b.created_at }
      else if (sortField === 'full_name') { aVal = a.full_name; bVal = b.full_name }
      else if (sortField === 'brand') { aVal = a.brand?.name ?? ''; bVal = b.brand?.name ?? '' }
      else if (sortField === 'consultant') { aVal = a.consultant?.full_name ?? ''; bVal = b.consultant?.full_name ?? '' }
      else if (sortField === 'status') {
        aVal = a.is_won ? 'won' : a.is_lost ? 'lost' : 'active'
        bVal = b.is_won ? 'won' : b.is_lost ? 'lost' : 'active'
      }
      if (sortDir === 'asc') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    })
    return list
  }, [customers, filterLocation, search, filterBrands, filterStages, filterConsultants, filterChannels, filterContactTypes, filterStatus, filterDate, dateFrom, dateTo, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const activeFilters = filterBrands.length + filterStages.length + filterConsultants.length + filterChannels.length + filterContactTypes.length + (filterStatus ? 1 : 0)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    resetPage()
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 text-gray-300 group-hover:text-gray-400" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 text-blue-500" />
      : <ChevronDown className="h-3 w-3 text-blue-500" />
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id))

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)))
    }
  }

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleDeleteSelected = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setIsDeleting(true)
    try {
      const supabase = createClient()
      const ids = Array.from(selectedIds)
      const { error } = await supabase
        .from('customers')
        .update({ is_active: false })
        .in('id', ids)
      if (error) throw error
      toast.success(`${ids.length} müşteri silindi`)
      setSelectedIds(new Set())
      setConfirmDelete(false)
      router.refresh()
    } catch {
      toast.error('Silme işlemi başarısız')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      {/* Location filter tabs */}
      {locations.length > 1 && (() => {
        const LOCATION_COLORS = [
          { text: '#4F46E5', bg: 'rgba(99,102,241,0.07)',  badge: 'rgba(99,102,241,0.12)', badgeText: '#4338CA' },
          { text: '#059669', bg: 'rgba(16,185,129,0.07)',  badge: 'rgba(16,185,129,0.12)', badgeText: '#047857' },
          { text: '#D97706', bg: 'rgba(245,158,11,0.07)',  badge: 'rgba(245,158,11,0.12)', badgeText: '#B45309' },
          { text: '#DC2626', bg: 'rgba(239,68,68,0.07)',   badge: 'rgba(239,68,68,0.12)',  badgeText: '#B91C1C' },
        ]
        return (
          <div className="flex items-center gap-2 mb-4 flex-wrap justify-between">
            <button
              onClick={() => { setFilterLocation(''); resetPage() }}
              className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-sm font-medium transition-all border"
              style={filterLocation === ''
                ? { background: 'rgba(59,130,246,0.07)', color: '#3B82F6', borderColor: 'rgba(100,116,139,0.45)', boxShadow: 'inset 0 0 0 1px rgba(100,116,139,0.2)' }
                : { background: 'rgba(59,130,246,0.07)', color: '#3B82F6', borderColor: 'rgba(59,130,246,0.2)' }
              }
            >
              Tümü
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#2563EB' }}>
                {customers.length}
              </span>
            </button>
            {locations.map((loc, idx) => {
              const c = LOCATION_COLORS[idx % LOCATION_COLORS.length]
              const count = customers.filter(cu => cu.location_id === loc.id).length
              const isActive = filterLocation === loc.id
              return (
                <button
                  key={loc.id}
                  onClick={() => { setFilterLocation(loc.id); resetPage() }}
                  className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-sm font-medium transition-all border"
                  style={isActive
                    ? { background: c.bg, color: c.text, borderColor: 'rgba(100,116,139,0.45)', boxShadow: 'inset 0 0 0 1px rgba(100,116,139,0.2)' }
                    : { background: c.bg, color: c.text, borderColor: 'rgba(0,0,0,0.08)' }
                  }
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  {loc.name}
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: c.badge, color: c.badgeText }}>
                    {count}
                  </span>
                </button>
              )
            })}

            <Link
              href="/customers/new"
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white text-sm shadow-sm hover:bg-blue-700 transition-colors shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              Yeni Müşteri
            </Link>
          </div>
        )
      })()}

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="İsim, telefon veya araç ara..."
            value={search} onChange={(e) => { setSearch(e.target.value); resetPage() }}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
          {search && (
            <button onClick={() => { setSearch(''); resetPage() }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <StyledSelect
          value={filterStatus}
          onChange={(v) => { setFilterStatus(v); resetPage() }}
          placeholder="Tüm Durumlar"
          className="w-32 sm:w-36"
          options={[
            { id: 'active', label: 'Aktif Takip', color: '#3B82F6' },
            { id: 'won',    label: 'Kazanılan',   color: '#10B981' },
            { id: 'lost',   label: 'Kaybedilen',  color: '#EF4444' },
          ]}
        />
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 h-10 px-4 rounded-lg border text-sm font-medium shadow-sm transition-colors ${
            activeFilters > 0 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}>
          <Filter className="h-4 w-4" />
          Filtre {activeFilters > 0 && `(${activeFilters})`}
        </button>

        {/* Excel Export */}
        <button
          onClick={canExport ? exportToCSV : undefined}
          title={canExport ? `${filtered.length} müşteriyi Excel'e aktar` : 'Bu işlem için yetkiniz yok'}
          className={`flex items-center gap-1.5 h-10 px-4 rounded-lg border text-sm font-medium shadow-sm transition-colors ${
            canExport
              ? 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer'
              : 'bg-white border-gray-100 text-gray-300 cursor-not-allowed opacity-50'
          }`}
        >
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline">Excel</span>
        </button>
      </div>

      {/* Date tabs */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {DATE_TABS.map((tab) => (
          <button key={tab.key} onClick={() => { setFilterDate(tab.key); resetPage() }}
            className={`h-7 px-3 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterDate === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {tab.key === 'custom' && <CalendarDays className="h-3 w-3" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Custom date range picker */}
      {filterDate === 'custom' && (
        <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            <div>
              <label className="text-xs font-medium text-blue-700 block mb-0.5">Başlangıç</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="h-8 rounded-lg border border-blue-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700" />
            </div>
            <span className="text-blue-400 font-bold mt-4">—</span>
            <div>
              <label className="text-xs font-medium text-blue-700 block mb-0.5">Bitiş</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                min={dateFrom}
                className="h-8 rounded-lg border border-blue-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700" />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }}
                className="mt-4 text-xs text-blue-500 hover:text-blue-700 underline">
                Temizle
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expanded filters */}
      {showFilters && (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 mb-3 shadow-sm">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Marka</label>
              <MultiSelect
                label="Tümü"
                options={brands.map(b => ({ id: b.id, label: b.name, color: b.color }))}
                selected={filterBrands}
                onChange={(v) => { setFilterBrands(v); resetPage() }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Aşama</label>
              <MultiSelect
                label="Tümü"
                options={stages.map(s => ({ id: s.id, label: s.name, color: s.color }))}
                selected={filterStages}
                onChange={(v) => { setFilterStages(v); resetPage() }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Danışman</label>
              <MultiSelect
                label="Tümü"
                options={consultants.map(c => ({ id: c.id, label: c.full_name }))}
                selected={filterConsultants}
                onChange={(v) => { setFilterConsultants(v); resetPage() }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Nereden Ulaştı?</label>
              <MultiSelect
                label="Tümü"
                options={channels.map(ch => ({ id: ch.id, label: ch.name, color: ch.color }))}
                selected={filterChannels}
                onChange={(v) => { setFilterChannels(v); resetPage() }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Temas Türü</label>
              <MultiSelect
                label="Tümü"
                options={contactTypes.map(ct => ({ id: ct.slug, label: ct.name, color: ct.color }))}
                selected={filterContactTypes}
                onChange={(v) => { setFilterContactTypes(v); resetPage() }}
              />
            </div>
          </div>
          {activeFilters > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {filterBrands.map(id => {
                  const b = brands.find(x => x.id === id)
                  return b ? (
                    <span key={id} className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold border" style={{ backgroundColor: b.color + '15', color: b.color, borderColor: b.color + '30' }}>
                      {b.name}
                      <button onClick={() => { setFilterBrands(p => p.filter(v => v !== id)); resetPage() }}><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ) : null
                })}
                {filterStages.map(id => {
                  const s = stages.find(x => x.id === id)
                  return s ? (
                    <span key={id} className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold border" style={{ backgroundColor: s.color + '15', color: s.color, borderColor: s.color + '30' }}>
                      {s.name}
                      <button onClick={() => { setFilterStages(p => p.filter(v => v !== id)); resetPage() }}><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ) : null
                })}
                {filterConsultants.map(id => {
                  const c = consultants.find(x => x.id === id)
                  return c ? (
                    <span key={id} className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
                      {c.full_name}
                      <button onClick={() => { setFilterConsultants(p => p.filter(v => v !== id)); resetPage() }}><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ) : null
                })}
                {filterChannels.map(id => {
                  const ch = channels.find(x => x.id === id)
                  return ch ? (
                    <span key={id} className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold border" style={{ backgroundColor: (ch.color || '#6B7280') + '15', color: ch.color || '#6B7280', borderColor: (ch.color || '#6B7280') + '30' }}>
                      {ch.name}
                      <button onClick={() => { setFilterChannels(p => p.filter(v => v !== id)); resetPage() }}><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ) : null
                })}
                {filterContactTypes.map(slug => {
                  const ct = contactTypes.find(x => x.slug === slug)
                  return ct ? (
                    <span key={slug} className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold border" style={{ backgroundColor: (ct.color || '#6B7280') + '15', color: ct.color || '#6B7280', borderColor: (ct.color || '#6B7280') + '30' }}>
                      {ct.name}
                      <button onClick={() => { setFilterContactTypes(p => p.filter(v => v !== slug)); resetPage() }}><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ) : null
                })}
              </div>
              <button
                onClick={() => { setFilterBrands([]); setFilterStages([]); setFilterConsultants([]); setFilterChannels([]); setFilterContactTypes([]); setFilterStatus(''); resetPage() }}
                className="shrink-0 text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 ml-3"
              >
                <X className="h-3 w-3" /> Tümünü Temizle
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">{filtered.length} müşteri</span>
            {filtered.length > PAGE_SIZE && (
              <span className="text-xs text-gray-400">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} gösteriliyor
              </span>
            )}
            {selectedIds.size > 0 && (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                {selectedIds.size} seçili
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk delete */}
            {canDelete && selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                {confirmDelete && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {selectedIds.size} müşteri silinecek, emin misiniz?
                  </div>
                )}
                {confirmDelete && (
                  <button onClick={() => setConfirmDelete(false)}
                    className="h-7 px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    İptal
                  </button>
                )}
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className={`flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold transition-all ${
                    confirmDelete
                      ? 'bg-red-600 border border-red-600 text-white hover:bg-red-700 shadow-sm'
                      : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'
                  } disabled:opacity-50`}>
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeleting ? 'Siliniyor...' : confirmDelete ? 'Evet, Sil' : `Sil (${selectedIds.size})`}
                </button>
              </div>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Search className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm font-medium text-gray-600">Müşteri bulunamadı</p>
            <p className="text-xs mt-1">Arama veya filtre kriterlerini değiştirin</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100">
                {/* Checkbox column */}
                {canDelete && (
                  <th className="pl-4 pr-2 py-2.5 w-8">
                    <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  </th>
                )}
                {/* Row number */}
                <th className="px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide w-10 text-center">#</th>
                {/* Sortable: Müşteri */}
                <th className="text-left px-4 py-2.5">
                  <button onClick={() => handleSort('full_name')} className="group flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors">
                    Müşteri <SortIcon field="full_name" />
                  </button>
                </th>
                {/* Sortable: Marka */}
                <th className="text-left px-3 py-2.5 hidden md:table-cell">
                  <button onClick={() => handleSort('brand')} className="group flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors">
                    Marka <SortIcon field="brand" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden xl:table-cell">Şube</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Telefon</th>
                {/* Sortable: Durum */}
                <th className="text-left px-3 py-2.5">
                  <button onClick={() => handleSort('status')} className="group flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors">
                    Durum <SortIcon field="status" />
                  </button>
                </th>
                {/* Sortable: Danışman */}
                <th className="text-left px-3 py-2.5 hidden lg:table-cell">
                  <button onClick={() => handleSort('consultant')} className="group flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors">
                    Danışman <SortIcon field="consultant" />
                  </button>
                </th>
                {/* Sortable: Tarih */}
                <th className="text-left px-3 py-2.5 hidden md:table-cell">
                  <button onClick={() => handleSort('created_at')} className="group flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors">
                    Tarih <SortIcon field="created_at" />
                  </button>
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {paged.map((customer, idx) => {
                const globalIdx = (safePage - 1) * PAGE_SIZE + idx + 1
                const HIDDEN_STAGE_SLUGS = ['sigorta', 'oto-koruma']
                const displayStage = customer.current_stage && HIDDEN_STAGE_SLUGS.includes(customer.current_stage.slug ?? '')
                  ? stages.find(s => s.slug === 'kabul') ?? customer.current_stage
                  : customer.current_stage
                const StageIcon = displayStage?.slug ? (stageIcons[displayStage.slug] ?? Car) : Car
                const isSelected = selectedIds.has(customer.id)
                return (
                  <tr key={customer.id}
                    onClick={() => router.push(`/customers/${customer.id}`)}
                    className={`border-b border-gray-50 hover:bg-blue-50/50 transition-colors cursor-pointer group ${
                      isSelected ? 'bg-blue-50/70' : idx % 2 === 1 ? 'bg-gray-50/60' : ''
                    }`}>
                    {/* Checkbox */}
                    {canDelete && (
                      <td className="pl-4 pr-2 py-2.5 w-8" onClick={(e) => toggleSelect(customer.id, e)}>
                        <input type="checkbox" checked={isSelected} onChange={() => {}}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                      </td>
                    )}
                    {/* Row number */}
                    <td className="px-2 py-2.5 text-center">
                      <span className="text-xs font-mono text-gray-400">{globalIdx}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/customers/${customer.id}`} className="flex items-center gap-2.5" onClick={e => e.stopPropagation()}>
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: customer.brand?.color ?? '#6B7280' }}>
                          {customer.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{customer.full_name}</p>
                          {customer.interested_model && <p className="text-[11px] text-gray-400">{customer.interested_model}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: (customer.brand?.color ?? '#6B7280') + '15', color: customer.brand?.color ?? '#6B7280', borderColor: (customer.brand?.color ?? '#6B7280') + '30' }}>
                        {customer.brand?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 hidden xl:table-cell">
                      {customer.location?.name ? (() => {
                        const locIdx = locations.findIndex(l => l.id === customer.location_id)
                        const c = LOCATION_PALETTE[(locIdx >= 0 ? locIdx : 0) % LOCATION_PALETTE.length]
                        return (
                          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: c.bg, borderColor: c.border, color: c.color }}>
                            <Building2 className="h-2.5 w-2.5 shrink-0" />
                            {customer.location.name}
                          </span>
                        )
                      })() : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className="text-xs text-gray-600">{customer.phone}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {customer.is_won ? (
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3" /> Satış Yapıldı
                        </span>
                      ) : customer.is_lost ? (
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600 border-red-200">
                          <X className="h-3 w-3" /> Kaçan Satış
                        </span>
                      ) : displayStage ? (
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: displayStage.color + '15', color: displayStage.color, borderColor: displayStage.color + '30' }}>
                          <StageIcon className="h-3 w-3" /> {displayStage.name}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className="text-xs text-gray-600">{customer.consultant?.full_name ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <span className="text-xs text-gray-400">{formatDate(customer.created_at, { time: true })}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/customers/${customer.id}`} onClick={e => e.stopPropagation()}>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Toplam <span className="font-semibold text-gray-700">{filtered.length}</span> müşteri —
              Sayfa <span className="font-semibold text-gray-700">{safePage}</span> / {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={safePage === 1}
                className="h-7 w-7 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                title="İlk sayfa"
              >«</button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="h-7 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >Önceki</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number
                if (totalPages <= 5) p = i + 1
                else if (safePage <= 3) p = i + 1
                else if (safePage >= totalPages - 2) p = totalPages - 4 + i
                else p = safePage - 2 + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-7 w-7 rounded-lg text-xs font-semibold transition-all ${
                      p === safePage
                        ? 'bg-blue-600 text-white shadow-sm border border-blue-600'
                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >{p}</button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="h-7 px-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >Sonraki</button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
                className="h-7 w-7 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                title="Son sayfa"
              >»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
