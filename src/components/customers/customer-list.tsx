'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Filter, ChevronRight, Phone, Mail, MapPin, Car, FileText, Clock, CheckCircle, Shield, Lock } from 'lucide-react'
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

export function CustomerList({ customers, brands, stages, consultants }: CustomerListProps) {
  const [search, setSearch] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterConsultant, setFilterConsultant] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    let list = [...customers]

    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(s) ||
          c.phone.includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          c.interested_model?.toLowerCase().includes(s)
      )
    }
    if (filterBrand) list = list.filter((c) => c.brand_id === filterBrand)
    if (filterStage) list = list.filter((c) => c.current_stage_id === filterStage)
    if (filterConsultant) list = list.filter((c) => c.consultant_id === filterConsultant)
    if (filterStatus === 'active') list = list.filter((c) => !c.is_won && !c.is_lost)
    if (filterStatus === 'won') list = list.filter((c) => c.is_won)
    if (filterStatus === 'lost') list = list.filter((c) => c.is_lost)

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
  }, [customers, search, filterBrand, filterStage, filterConsultant, filterStatus, sortField, sortDir])

  const activeFilters = [filterBrand, filterStage, filterConsultant, filterStatus].filter(Boolean).length

  return (
    <div>
      {/* Search & Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="İsim, telefon veya araç ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors',
            showFilters || activeFilters > 0
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          )}
        >
          <Filter className="h-4 w-4" />
          Filtrele
          {activeFilters > 0 && (
            <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Marka</label>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-300 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Markalar</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Aşama</label>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-300 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Aşamalar</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Danışman</label>
            <select
              value={filterConsultant}
              onChange={(e) => setFilterConsultant(e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-300 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Danışmanlar</option>
              {consultants.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Durum</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-300 bg-white text-xs px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Durumlar</option>
              <option value="active">Aktif Takip</option>
              <option value="won">Kazanılan</option>
              <option value="lost">Kaybedilen</option>
            </select>
          </div>
          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterBrand(''); setFilterStage(''); setFilterConsultant(''); setFilterStatus('') }}
              className="text-xs text-red-600 hover:text-red-700 font-medium col-span-full text-left"
            >
              Filtreleri temizle
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-900">{filtered.length}</span> müşteri gösteriliyor
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sırala:</span>
          <select
            value={`${sortField}-${sortDir}`}
            onChange={(e) => {
              const [f, d] = e.target.value.split('-') as [SortField, SortDir]
              setSortField(f); setSortDir(d)
            }}
            className="h-7 rounded-lg border border-gray-300 bg-white text-xs px-2 focus:outline-none"
          >
            <option value="created_at-desc">En Yeni</option>
            <option value="created_at-asc">En Eski</option>
            <option value="full_name-asc">İsim A-Z</option>
            <option value="full_name-desc">İsim Z-A</option>
            <option value="brand-asc">Marka A-Z</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Search className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Müşteri bulunamadı</p>
            <p className="text-xs mt-1">Arama veya filtre kriterlerini değiştirin</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Müşteri</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Marka</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">İletişim</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aşama</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Danışman</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Kayıt</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((customer, idx) => {
                const StageIcon = customer.current_stage?.slug ? stageIcons[customer.current_stage.slug] ?? Car : Car
                return (
                  <tr
                    key={customer.id}
                    className={cn(
                      'hover:bg-blue-50/30 transition-colors cursor-pointer',
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    )}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/customers/${customer.id}`} className="flex items-center gap-2.5">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: customer.brand?.color ?? '#6B7280' }}
                        >
                          {customer.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{customer.full_name}</p>
                          {customer.is_won && <span className="text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">Kazanıldı</span>}
                          {customer.is_lost && <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">Kaybedildi</span>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: (customer.brand?.color ?? '#6B7280') + '22',
                          color: customer.brand?.color ?? '#6B7280',
                        }}
                      >
                        {customer.brand?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {customer.phone}
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {customer.current_stage ? (
                        <div className="flex items-center gap-1.5">
                          <StageIcon
                            className="h-3.5 w-3.5 flex-shrink-0"
                            style={{ color: customer.current_stage.color }}
                          />
                          <span
                            className="text-xs font-medium"
                            style={{ color: customer.current_stage.color }}
                          >
                            {customer.current_stage.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-600">{customer.consultant?.full_name ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-500">{formatDate(customer.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/customers/${customer.id}`}>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
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
