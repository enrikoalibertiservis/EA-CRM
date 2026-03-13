'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Search, Filter, ChevronRight, Car, FileText, Clock,
  CheckCircle, Shield, Lock, X, Trash2, CalendarDays, AlertTriangle,
  ChevronUp, ChevronDown, ChevronsUpDown, Building2,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Customer } from '@/lib/types/database'

const stageIcons: Record<string, React.ElementType> = {
  'arac-tanitimi': Car, 'teklif': FileText, 'dusunme': Clock,
  'kabul': CheckCircle, 'sigorta': Shield, 'oto-koruma': Lock,
}

const PAGE_SIZE = 20

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
type DateMode = '' | 'today' | 'week' | 'month' | 'last_month' | 'custom'

const DATE_TABS: { key: DateMode; label: string }[] = [
  { key: '', label: 'Tümü' },
  { key: 'today', label: 'Bugün' },
  { key: 'week', label: 'Bu Hafta' },
  { key: 'month', label: 'Bu Ay' },
  { key: 'last_month', label: 'Geçen Ay' },
  { key: 'custom', label: 'Özel Tarih' },
]

const CAN_DELETE = ['super_admin', 'manager']

export function CustomerList({ customers, brands, stages, consultants, locations, channels, contactTypes, userRole }: CustomerListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterConsultant, setFilterConsultant] = useState('')
  const [filterChannel, setFilterChannel] = useState('')
  const [filterContactType, setFilterContactType] = useState('')
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

  const canDelete = CAN_DELETE.includes(userRole)

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
    if (filterBrand) list = list.filter(c => c.brand_id === filterBrand)
    if (filterStage) list = list.filter(c => c.current_stage_id === filterStage)
    if (filterConsultant) list = list.filter(c => c.consultant_id === filterConsultant)
    if (filterChannel) list = list.filter(c => c.source_channel_id === filterChannel)
    if (filterContactType) list = list.filter(c => c.initial_contact_type === filterContactType)
    if (filterStatus === 'active') list = list.filter(c => !c.is_won && !c.is_lost)
    if (filterStatus === 'won') list = list.filter(c => c.is_won)
    if (filterStatus === 'lost') list = list.filter(c => c.is_lost)

    if (filterDate === 'today') {
      const todayStr = now.toISOString().split('T')[0]
      list = list.filter(c => c.created_at.startsWith(todayStr))
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
  }, [customers, filterLocation, search, filterBrand, filterStage, filterConsultant, filterChannel, filterContactType, filterStatus, filterDate, dateFrom, dateTo, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const activeFilters = [filterBrand, filterStage, filterConsultant, filterChannel, filterContactType, filterStatus].filter(Boolean).length

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
      {locations.length > 1 && (
        <div className="flex items-center gap-2 mb-4 p-1 bg-gray-100 rounded-xl w-fit">
          <button
            onClick={() => { setFilterLocation(''); resetPage() }}
            className={`flex items-center gap-1.5 h-8 px-4 rounded-lg text-sm font-medium transition-all ${
              filterLocation === '' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Tümü
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filterLocation === '' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
              {customers.length}
            </span>
          </button>
          {locations.map(loc => {
            const count = customers.filter(c => c.location_id === loc.id).length
            return (
              <button
                key={loc.id}
                onClick={() => { setFilterLocation(loc.id); resetPage() }}
                className={`flex items-center gap-1.5 h-8 px-4 rounded-lg text-sm font-medium transition-all ${
                  filterLocation === loc.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                {loc.name}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filterLocation === loc.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

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
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); resetPage() }}
          className="h-10 w-32 sm:w-36 rounded-lg border border-gray-200 bg-white text-sm px-2 sm:px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
          <option value="">Tüm Durumlar</option>
          <option value="active">Aktif Takip</option>
          <option value="won">Kazanılan</option>
          <option value="lost">Kaybedilen</option>
        </select>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 h-10 px-4 rounded-lg border text-sm font-medium shadow-sm transition-colors ${
            activeFilters > 0 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}>
          <Filter className="h-4 w-4" />
          Filtre {activeFilters > 0 && `(${activeFilters})`}
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
        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-3 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 shadow-sm">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Marka</label>
            <select value={filterBrand} onChange={(e) => { setFilterBrand(e.target.value); resetPage() }}
              className="w-full h-9 rounded-md border border-gray-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tümü</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Aşama</label>
            <select value={filterStage} onChange={(e) => { setFilterStage(e.target.value); resetPage() }}
              className="w-full h-9 rounded-md border border-gray-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tümü</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Danışman</label>
            <select value={filterConsultant} onChange={(e) => { setFilterConsultant(e.target.value); resetPage() }}
              className="w-full h-9 rounded-md border border-gray-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tümü</option>
              {consultants.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Nereden Ulaştı?</label>
            <select value={filterChannel} onChange={(e) => { setFilterChannel(e.target.value); resetPage() }}
              className="w-full h-9 rounded-md border border-gray-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tümü</option>
              {channels.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Temas Türü</label>
            <select value={filterContactType} onChange={(e) => { setFilterContactType(e.target.value); resetPage() }}
              className="w-full h-9 rounded-md border border-gray-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tümü</option>
              {contactTypes.map((ct) => <option key={ct.id} value={ct.slug}>{ct.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            {activeFilters > 0 && (
              <button onClick={() => { setFilterBrand(''); setFilterStage(''); setFilterConsultant(''); setFilterChannel(''); setFilterContactType(''); setFilterStatus(''); resetPage() }}
                className="h-9 w-full rounded-md border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors">
                Temizle
              </button>
            )}
          </div>
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
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden xl:table-cell">Ek Hizmet</th>
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
                    <td className="px-3 py-2.5 hidden xl:table-cell">
                      <div className="flex items-center gap-1">
                        {(customer.insurance_kasko_sold || customer.insurance_trafik_sold) && (
                          <span title={[customer.insurance_kasko_sold && 'Kasko', customer.insurance_trafik_sold && 'Trafik'].filter(Boolean).join(' + ') + ' Satıldı'}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            <Shield className="h-2.5 w-2.5" />
                            {customer.insurance_kasko_sold && customer.insurance_trafik_sold ? 'K+T' : customer.insurance_kasko_sold ? 'Kasko' : 'Trafik'}
                          </span>
                        )}
                        {customer.oto_koruma_sold && (
                          <span title="Oto Koruma Satıldı"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                            <Lock className="h-2.5 w-2.5" /> OK
                          </span>
                        )}
                        {!customer.insurance_kasko_sold && !customer.insurance_trafik_sold && !customer.oto_koruma_sold && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <span className="text-xs text-gray-400">{formatDate(customer.created_at)}</span>
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
