'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Filter, ChevronRight, Phone, Car, FileText, Clock, CheckCircle, Shield, Lock, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Customer } from '@/lib/types/database'

const stageIcons: Record<string, React.ElementType> = {
  'arac-tanitimi': Car, 'teklif': FileText, 'dusunme': Clock,
  'kabul': CheckCircle, 'sigorta': Shield, 'oto-koruma': Lock,
}

interface CustomerListProps {
  customers: Customer[]
  brands: { id: string; name: string; color: string; slug: string }[]
  stages: { id: string; name: string; color: string; slug: string; sort_order: number }[]
  consultants: { id: string; full_name: string }[]
}

type SortField = 'created_at' | 'full_name' | 'brand'
type SortDir = 'asc' | 'desc'

const DATE_TABS = [
  { key: '', label: 'Tümü' },
  { key: 'today', label: 'Bugün' },
  { key: 'week', label: 'Bu Hafta' },
  { key: 'month', label: 'Bu Ay' },
]

export function CustomerList({ customers, brands, stages, consultants }: CustomerListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterConsultant, setFilterConsultant] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    let list = [...customers]
    const now = new Date()

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
    }

    list.sort((a, b) => {
      let aVal: string = '', bVal: string = ''
      if (sortField === 'created_at') { aVal = a.created_at; bVal = b.created_at }
      if (sortField === 'full_name') { aVal = a.full_name; bVal = b.full_name }
      if (sortField === 'brand') { aVal = a.brand?.name ?? ''; bVal = b.brand?.name ?? '' }
      if (sortDir === 'asc') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    })
    return list
  }, [customers, search, filterBrand, filterStage, filterConsultant, filterStatus, filterDate, sortField, sortDir])

  const activeFilters = [filterBrand, filterStage, filterConsultant, filterStatus].filter(Boolean).length

  return (
    <div>
      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="İsim, telefon, e-posta veya araç ara..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 w-36 rounded-lg border border-gray-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
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
      <div className="flex items-center gap-1 mb-3">
        {DATE_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setFilterDate(tab.key)}
            className={`h-7 px-3 rounded-full text-xs font-medium transition-all ${
              filterDate === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-3 grid grid-cols-2 lg:grid-cols-4 gap-3 shadow-sm">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Marka</label>
            <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tümü</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Aşama</label>
            <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tümü</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Danışman</label>
            <select value={filterConsultant} onChange={(e) => setFilterConsultant(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-200 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tümü</option>
              {consultants.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            {activeFilters > 0 && (
              <button onClick={() => { setFilterBrand(''); setFilterStage(''); setFilterConsultant(''); setFilterStatus('') }}
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
          <span className="text-sm font-semibold text-gray-900">{filtered.length} müşteri</span>
          <select value={`${sortField}-${sortDir}`}
            onChange={(e) => { const [f, d] = e.target.value.split('-') as [SortField, SortDir]; setSortField(f); setSortDir(d) }}
            className="h-7 rounded border border-gray-200 bg-white text-xs px-2 focus:outline-none">
            <option value="created_at-desc">En Yeni</option>
            <option value="created_at-asc">En Eski</option>
            <option value="full_name-asc">İsim A-Z</option>
            <option value="brand-asc">Marka A-Z</option>
          </select>
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
              <tr className="bg-slate-50 hover:bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Müşteri</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Marka</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Telefon</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Durum</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">Danışman</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden xl:table-cell">Ek Hizmet</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Tarih</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer, idx) => {
                // Sigorta ve Oto Koruma aşamaları listede gösterilmez, Kabul olarak kalır
                const HIDDEN_STAGE_SLUGS = ['sigorta', 'oto-koruma']
                const displayStage = customer.current_stage && HIDDEN_STAGE_SLUGS.includes(customer.current_stage.slug ?? '')
                  ? stages.find(s => s.slug === 'kabul') ?? customer.current_stage
                  : customer.current_stage
                const StageIcon = displayStage?.slug ? (stageIcons[displayStage.slug] ?? Car) : Car
                return (
                  <tr key={customer.id}
                    onClick={() => router.push(`/customers/${customer.id}`)}
                    className={`border-b border-gray-50 hover:bg-blue-50/50 transition-colors cursor-pointer group ${idx % 2 === 1 ? 'bg-gray-50/60' : ''}`}>
                    <td className="px-4 py-2.5">
                      <Link href={`/customers/${customer.id}`} className="flex items-center gap-2.5">
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
                          <X className="h-3 w-3" /> Kaybedildi
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
                      <Link href={`/customers/${customer.id}`}>
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
