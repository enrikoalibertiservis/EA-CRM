'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Filter, ChevronRight, Phone, Car, FileText, Clock, CheckCircle, Shield, Lock, X } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { Customer } from '@/lib/types/database'

const stageIcons: Record<string, React.ElementType> = {
  'arac-tanitimi': Car,
  'teklif': FileText,
  'dusunme': Clock,
  'kabul': CheckCircle,
  'sigorta': Shield,
  'oto-koruma': Lock,
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
        c.full_name.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.interested_model?.toLowerCase().includes(s)
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
      let aVal: string | number = ''
      let bVal: string | number = ''
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
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="İsim, telefon, e-posta, araç ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 rounded-xl border border-gray-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="">Tüm Durumlar</option>
          <option value="active">Aktif Takip</option>
          <option value="won">Kazanılan</option>
          <option value="lost">Kaybedilen</option>
        </select>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-1.5 h-10 px-4 rounded-xl border text-sm font-medium shadow-sm transition-colors',
            activeFilters > 0 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          )}
        >
          <Filter className="h-4 w-4" />
          Filtre
          {activeFilters > 0 && (
            <span className="h-4 w-4 rounded-full bg-white/30 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Date tabs */}
      <div className="flex items-center gap-1 mb-4">
        {DATE_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setFilterDate(tab.key)}
            className={cn(
              'h-8 px-4 rounded-xl text-xs font-semibold transition-all',
              filterDate === tab.key
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3 shadow-sm">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Marka</label>
            <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}
              className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tümü</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Aşama</label>
            <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}
              className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tümü</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Danışman</label>
            <select value={filterConsultant} onChange={(e) => setFilterConsultant(e.target.value)}
              className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tümü</option>
              {consultants.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            {activeFilters > 0 && (
              <button
                onClick={() => { setFilterBrand(''); setFilterStage(''); setFilterConsultant(''); setFilterStatus('') }}
                className="h-9 w-full rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5">
                <X className="h-3 w-3" />
                Temizle
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">Müşteriler</span>
            <span className="h-5 px-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Sırala:</span>
            <select
              value={`${sortField}-${sortDir}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('-') as [SortField, SortDir]
                setSortField(f); setSortDir(d)
              }}
              className="h-7 rounded-lg border border-gray-200 bg-white text-xs px-2 focus:outline-none"
            >
              <option value="created_at-desc">En Yeni</option>
              <option value="created_at-asc">En Eski</option>
              <option value="full_name-asc">İsim A-Z</option>
              <option value="full_name-desc">İsim Z-A</option>
              <option value="brand-asc">Marka A-Z</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Search className="h-7 w-7 opacity-40" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Müşteri bulunamadı</p>
            <p className="text-xs mt-1 text-gray-400">Arama veya filtre kriterlerini değiştirin</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">MÜŞTERİ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">MARKA</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">İLETİŞİM</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">AŞAMA / DURUM</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">DANIŞMAN</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">KAYIT</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer, idx) => {
                const StageIcon = customer.current_stage?.slug ? (stageIcons[customer.current_stage.slug] ?? Car) : Car
                const isWon = customer.is_won
                const isLost = customer.is_lost

                return (
                  <tr
                    key={customer.id}
                    className={cn(
                      'border-t border-gray-50 hover:bg-blue-50/40 transition-colors cursor-pointer group',
                      idx % 2 === 1 && 'bg-gray-50/30'
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <Link href={`/customers/${customer.id}`} className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${customer.brand?.color ?? '#6B7280'}, ${customer.brand?.color ?? '#6B7280'}bb)` }}>
                          {customer.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{customer.full_name}</p>
                          {customer.interested_model && (
                            <p className="text-xs text-gray-400 mt-0.5">{customer.interested_model}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{
                          backgroundColor: (customer.brand?.color ?? '#6B7280') + '18',
                          color: customer.brand?.color ?? '#6B7280',
                        }}>
                        {customer.brand?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        {customer.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {isWon ? (
                        <span className="badge" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
                          <CheckCircle className="h-3 w-3" /> Kazanıldı
                        </span>
                      ) : isLost ? (
                        <span className="badge" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                          <X className="h-3 w-3" /> Kaybedildi
                        </span>
                      ) : customer.current_stage ? (
                        <span className="badge"
                          style={{ backgroundColor: customer.current_stage.color + '18', color: customer.current_stage.color }}>
                          <StageIcon className="h-3 w-3" />
                          {customer.current_stage.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs font-medium text-gray-700">{customer.consultant?.full_name ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-gray-400">{formatDate(customer.created_at)}</span>
                    </td>
                    <td className="px-4 py-3.5">
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
