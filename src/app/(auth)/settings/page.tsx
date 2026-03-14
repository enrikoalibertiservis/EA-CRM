'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Settings, Car, MapPin, Building2, Plus, Pencil, Trash2,
  ChevronRight, Shield, Check, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types & Helpers ──────────────────────────────────────────────────────────

interface ColumnItem { id: string; name: string; [key: string]: unknown }

interface EditField {
  key: string
  label: string
  type: 'text' | 'select' | 'color' | 'number'
  options?: { value: string; label: string }[]
}

function slugify(s: string) {
  return s.toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899', '#14B8A6', '#6366F1']
function nextColor(items: ColumnItem[]) { return PALETTE[items.length % PALETTE.length] }

// ─── Column Component ─────────────────────────────────────────────────────────

interface ColumnProps {
  title: string
  items: ColumnItem[]
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  onAdd: (name: string) => Promise<void>
  onSave: (id: string, patch: Record<string, unknown>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToggleActive?: (id: string, current: boolean) => Promise<void>
  addPlaceholder: string
  hasChildren?: boolean
  disabled?: boolean
  disabledMsg?: string
  renderItem?: (item: ColumnItem, isSelected: boolean) => React.ReactNode
  editFields?: EditField[]
}

function Column({
  title, items, selectedId, onSelect, onAdd, onSave, onDelete, onToggleActive,
  addPlaceholder, hasChildren, disabled, disabledMsg,
  renderItem, editFields = [],
}: ColumnProps) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, unknown>>({})

  const startEdit = (item: ColumnItem) => {
    const form: Record<string, unknown> = { name: item.name }
    editFields.forEach(f => { form[f.key] = item[f.key] ?? (f.type === 'color' ? '#3B82F6' : f.type === 'number' ? 0 : '') })
    setEditForm(form)
    setEditingId(item.id)
  }

  const cancelEdit = () => { setEditingId(null); setEditForm({}) }

  const handleSave = async (item: ColumnItem) => {
    if (!String(editForm.name ?? '').trim()) { toast.error('Ad zorunlu'); return }
    await onSave(item.id, editForm)
    cancelEdit()
  }

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    await onAdd(name)
    setNewName('')
  }

  return (
    <div className="flex-1 min-w-[200px] max-w-[320px] bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 tabular-nums">{items.length}</span>
      </div>

      {/* Add Input */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-gray-100 shrink-0">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !disabled) handleAdd() }}
          placeholder={disabled ? (disabledMsg ?? addPlaceholder) : addPlaceholder}
          disabled={disabled}
          className="flex-1 h-8 text-xs border border-gray-200 rounded-lg px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400"
        />
        <button
          onClick={handleAdd}
          disabled={disabled}
          className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Items */}
      <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
        {items.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">Henüz kayıt yok</p>
        ) : items.map(item => {
          const isSelected = selectedId === item.id
          const isEditing = editingId === item.id
          return (
            <div key={item.id} className="border-b border-gray-50 last:border-0">
              {isEditing ? (
                <div className="px-3 py-2.5 bg-indigo-50/60 space-y-2">
                  <input
                    value={editForm.name as string}
                    onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(item); if (e.key === 'Escape') cancelEdit() }}
                    autoFocus
                    className="w-full h-7 text-xs border border-indigo-200 rounded px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    placeholder="Ad"
                  />
                  {editFields.map(f => (
                    <div key={f.key}>
                      {f.type === 'color' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={(editForm[f.key] as string) || '#3B82F6'}
                            onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                            className="h-7 w-10 rounded border border-indigo-200 cursor-pointer"
                          />
                          <span className="text-[10px] text-gray-500">{f.label}</span>
                        </div>
                      ) : f.type === 'select' ? (
                        <select
                          value={editForm[f.key] as string}
                          onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full h-7 text-xs border border-indigo-200 rounded px-2 focus:outline-none bg-white"
                        >
                          {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : (
                        <input
                          type={f.type}
                          value={editForm[f.key] as string}
                          onChange={e => setEditForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                          className="w-full h-7 text-xs border border-indigo-200 rounded px-2 focus:outline-none bg-white"
                          placeholder={f.label}
                        />
                      )}
                    </div>
                  ))}
                  <div className="flex gap-1.5 justify-end">
                    <button onClick={cancelEdit} className="h-6 px-2.5 rounded text-[11px] border border-gray-200 text-gray-500 hover:bg-gray-50">İptal</button>
                    <button
                      onClick={() => handleSave(item)}
                      className="h-6 px-2.5 rounded text-[11px] bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1"
                    >
                      <Check className="h-2.5 w-2.5" /> Kaydet
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => onSelect?.(isSelected ? null : item.id)}
                  className={`flex items-center gap-1 px-3 py-2 transition-colors ${onSelect ? 'cursor-pointer' : ''} ${isSelected ? 'bg-indigo-50' : (item.is_active === false ? 'bg-gray-50/60 opacity-60' : 'hover:bg-gray-50')}`}
                >
                  <div className="flex-1 min-w-0 truncate">
                    {renderItem ? renderItem(item, isSelected) : (
                      <span className={`text-sm ${isSelected ? 'text-indigo-700 font-semibold' : 'text-gray-800'}`}>{item.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {hasChildren && (
                      <ChevronRight className={`h-3.5 w-3.5 mr-0.5 ${isSelected ? 'text-indigo-400' : 'text-gray-300'}`} />
                    )}
                    {onToggleActive && (
                      <button
                        onClick={e => { e.stopPropagation(); onToggleActive(item.id, item.is_active as boolean) }}
                        title={item.is_active ? 'Pasif yap' : 'Aktif yap'}
                        className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${item.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-300 hover:text-emerald-400 hover:bg-emerald-50'}`}
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); startEdit(item) }}
                      className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(item.id) }}
                      className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const supabase = createClient()
  const [myRole, setMyRole] = useState('')
  const [loading, setLoading] = useState(true)

  const [brands, setBrands] = useState<ColumnItem[]>([])
  const [models, setModels] = useState<ColumnItem[]>([])
  const [locations, setLocations] = useState<ColumnItem[]>([])
  const [channels, setChannels] = useState<ColumnItem[]>([])
  const [stages, setStages] = useState<ColumnItem[]>([])
  const [lostReasons, setLostReasons] = useState<ColumnItem[]>([])

  // Aktif kanallar önce, pasifler sonra
  const sortedChannels = [...channels].sort((a, b) => {
    if (a.is_active === b.is_active) return (a.sort_order as number) - (b.sort_order as number)
    return a.is_active ? -1 : 1
  })

  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    setMyRole(p?.role ?? '')
    if (p?.role !== 'super_admin') { setLoading(false); return }

    const [b, m, l, c, s, lr] = await Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase.from('vehicle_models').select('*').order('sort_order'),
      supabase.from('locations').select('*').order('name'),
      supabase.from('contact_channels').select('*').order('sort_order'),
      supabase.from('sales_stages').select('*').order('sort_order'),
      supabase.from('lost_reasons').select('*').order('sort_order'),
    ])
    setBrands(b.data ?? [])
    setModels(m.data ?? [])
    setLocations(l.data ?? [])
    setChannels(c.data ?? [])
    setStages(s.data ?? [])
    setLostReasons(lr.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadAll() }, [loadAll])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  if (myRole !== 'super_admin') return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <Shield className="h-12 w-12 mb-3 opacity-30" />
      <p className="text-sm font-medium">Erişim yetkiniz yok</p>
    </div>
  )

  // ── Brand CRUD ───────────────────────────────────────────────────────────────

  const addBrand = async (name: string) => {
    const { data, error } = await supabase.from('brands').insert({
      name, slug: slugify(name), color: nextColor(brands), text_color: '#FFFFFF', is_active: true,
    }).select().single()
    if (error) { toast.error(error.message); return }
    setBrands(p => [...p, data as ColumnItem])
    toast.success('Marka eklendi')
  }

  const saveBrand = async (id: string, patch: Record<string, unknown>) => {
    const update = { ...patch, ...(patch.name ? { slug: slugify(patch.name as string) } : {}) }
    const { error } = await supabase.from('brands').update(update).eq('id', id)
    if (error) { toast.error(error.message); return }
    setBrands(p => p.map(b => b.id === id ? { ...b, ...patch } : b))
    toast.success('Güncellendi')
  }

  const deleteBrand = async (id: string) => {
    if (!confirm('Bu markayı ve tüm modellerini silmek istiyor musunuz?')) return
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (error) { toast.error('Silinemedi: ' + error.message); return }
    setBrands(p => p.filter(b => b.id !== id))
    setModels(p => p.filter(m => m.brand_id !== id))
    if (selectedBrandId === id) setSelectedBrandId(null)
    toast.success('Silindi')
  }

  // ── Model CRUD ───────────────────────────────────────────────────────────────

  const addModel = async (name: string) => {
    if (!selectedBrandId) { toast.error('Önce marka seçin'); return }
    const brandModels = models.filter(m => m.brand_id === selectedBrandId)
    const { data, error } = await supabase.from('vehicle_models').insert({
      name, brand_id: selectedBrandId, is_active: true, sort_order: brandModels.length,
    }).select().single()
    if (error) { toast.error(error.message); return }
    setModels(p => [...p, data as ColumnItem])
    toast.success('Model eklendi')
  }

  const saveModel = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from('vehicle_models').update(patch).eq('id', id)
    if (error) { toast.error(error.message); return }
    setModels(p => p.map(m => m.id === id ? { ...m, ...patch } : m))
    toast.success('Güncellendi')
  }

  const deleteModel = async (id: string) => {
    if (!confirm('Bu modeli silmek istiyor musunuz?')) return
    const { error } = await supabase.from('vehicle_models').delete().eq('id', id)
    if (error) { toast.error('Silinemedi: ' + error.message); return }
    setModels(p => p.filter(m => m.id !== id))
    toast.success('Silindi')
  }

  // ── Location CRUD ────────────────────────────────────────────────────────────

  const addLocation = async (name: string) => {
    const { data, error } = await supabase.from('locations').insert({ name, type: 'main' }).select().single()
    if (error) { toast.error(error.message); return }
    setLocations(p => [...p, data as ColumnItem])
    toast.success('Lokasyon eklendi')
  }

  const saveLocation = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from('locations').update(patch).eq('id', id)
    if (error) { toast.error(error.message); return }
    setLocations(p => p.map(l => l.id === id ? { ...l, ...patch } : l))
    toast.success('Güncellendi')
  }

  const deleteLocation = async (id: string) => {
    if (!confirm('Bu lokasyonu silmek istiyor musunuz?')) return
    const { error } = await supabase.from('locations').delete().eq('id', id)
    if (error) { toast.error('Silinemedi: ' + error.message); return }
    setLocations(p => p.filter(l => l.id !== id))
    toast.success('Silindi')
  }

  // ── Channel CRUD ─────────────────────────────────────────────────────────────

  const addChannel = async (name: string) => {
    const { data, error } = await supabase.from('contact_channels').insert({
      name, slug: slugify(name), color: nextColor(channels), icon_name: 'phone', is_active: true, sort_order: channels.length,
    }).select().single()
    if (error) { toast.error(error.message); return }
    setChannels(p => [...p, data as ColumnItem])
    toast.success('Kanal eklendi')
  }

  const saveChannel = async (id: string, patch: Record<string, unknown>) => {
    const update = { ...patch, ...(patch.name ? { slug: slugify(patch.name as string) } : {}) }
    const { error } = await supabase.from('contact_channels').update(update).eq('id', id)
    if (error) { toast.error(error.message); return }
    setChannels(p => p.map(c => c.id === id ? { ...c, ...patch } : c))
    toast.success('Güncellendi')
  }

  const deleteChannel = async (id: string) => {
    if (!confirm('Bu kanalı silmek istiyor musunuz?')) return
    const { error } = await supabase.from('contact_channels').delete().eq('id', id)
    if (error) { toast.error('Silinemedi: ' + error.message); return }
    setChannels(p => p.filter(c => c.id !== id))
    toast.success('Silindi')
  }

  const toggleChannelActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('contact_channels').update({ is_active: !current }).eq('id', id)
    if (error) { toast.error(error.message); return }
    setChannels(p => p.map(c => c.id === id ? { ...c, is_active: !current } : c))
    toast.success(!current ? 'Kanal aktif edildi' : 'Kanal pasif yapıldı')
  }

  // ── Stage CRUD ───────────────────────────────────────────────────────────────

  const addStage = async (name: string) => {
    const { data, error } = await supabase.from('sales_stages').insert({
      name, slug: slugify(name), color: nextColor(stages), sort_order: stages.length, is_active: true, is_final: false, icon_name: 'circle',
    }).select().single()
    if (error) { toast.error(error.message); return }
    setStages(p => [...p, data as ColumnItem])
    toast.success('Aşama eklendi')
  }

  const saveStage = async (id: string, patch: Record<string, unknown>) => {
    const update = { ...patch, ...(patch.name ? { slug: slugify(patch.name as string) } : {}) }
    const { error } = await supabase.from('sales_stages').update(update).eq('id', id)
    if (error) { toast.error(error.message); return }
    setStages(p => p.map(s => s.id === id ? { ...s, ...patch } : s))
    toast.success('Güncellendi')
  }

  const deleteStage = async (id: string) => {
    if (!confirm('Bu aşamayı silmek istiyor musunuz?')) return
    const { error } = await supabase.from('sales_stages').delete().eq('id', id)
    if (error) { toast.error('Silinemedi: ' + error.message); return }
    setStages(p => p.filter(s => s.id !== id))
    toast.success('Silindi')
  }

  // ── LostReason CRUD ──────────────────────────────────────────────────────────

  const addLostReason = async (name: string) => {
    const { data, error } = await supabase.from('lost_reasons').insert({
      name, sort_order: lostReasons.length, is_active: true,
    }).select().single()
    if (error) { toast.error(error.message); return }
    setLostReasons(p => [...p, data as ColumnItem])
    toast.success('Sebep eklendi')
  }

  const saveLostReason = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from('lost_reasons').update(patch).eq('id', id)
    if (error) { toast.error(error.message); return }
    setLostReasons(p => p.map(r => r.id === id ? { ...r, ...patch } : r))
    toast.success('Güncellendi')
  }

  const deleteLostReason = async (id: string) => {
    if (!confirm('Bu sebebi silmek istiyor musunuz?')) return
    const { error } = await supabase.from('lost_reasons').delete().eq('id', id)
    if (error) { toast.error('Silinemedi: ' + error.message); return }
    setLostReasons(p => p.filter(r => r.id !== id))
    toast.success('Silindi')
  }

  const filteredModels = selectedBrandId ? models.filter(m => m.brand_id === selectedBrandId) : []

  return (
    <div className="space-y-8">

      {/* ── Araç Kataloğu ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Car className="h-5 w-5 text-orange-500" />
          <h2 className="text-base font-bold text-gray-900">Araç Kataloğu</h2>
        </div>
        <div className="flex gap-4 flex-wrap">
          <Column
            title="Marka"
            items={brands}
            selectedId={selectedBrandId}
            onSelect={id => setSelectedBrandId(id)}
            onAdd={addBrand}
            onSave={saveBrand}
            onDelete={deleteBrand}
            addPlaceholder="Yeni marka adı"
            hasChildren
            renderItem={(item, isSelected) => (
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color as string }} />
                <span className={`text-sm ${isSelected ? 'text-indigo-700 font-semibold' : 'text-gray-800'}`}>{item.name}</span>
              </div>
            )}
            editFields={[{ key: 'color', label: 'Renk', type: 'color' }]}
          />
          <Column
            title="Model"
            items={filteredModels}
            onAdd={addModel}
            onSave={saveModel}
            onDelete={deleteModel}
            addPlaceholder="Yeni model adı"
            disabled={!selectedBrandId}
            disabledMsg="← Önce marka seçin"
            editFields={[]}
          />
        </div>
      </div>

      {/* ── Diğer Parametreler ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-gray-500" />
          <h2 className="text-base font-bold text-gray-900">Diğer Parametreler</h2>
        </div>
        <div className="flex gap-4 flex-wrap">

          {/* Lokasyonlar */}
          <Column
            title="Lokasyonlar"
            items={locations}
            onAdd={addLocation}
            onSave={saveLocation}
            onDelete={deleteLocation}
            addPlaceholder="Yeni lokasyon adı"
            renderItem={(item, isSelected) => (
              <div className="flex items-center gap-2">
                {item.type === 'main'
                  ? <Building2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  : <MapPin className="h-3.5 w-3.5 text-teal-400 shrink-0" />}
                <span className={`text-sm truncate ${isSelected ? 'text-indigo-700 font-semibold' : 'text-gray-800'}`}>{item.name}</span>
                <span className="text-[10px] text-gray-400 ml-auto shrink-0">{item.type === 'main' ? 'Ana' : 'Uydu'}</span>
              </div>
            )}
            editFields={[{
              key: 'type', label: 'Tür', type: 'select',
              options: [{ value: 'main', label: 'Ana Bayi' }, { value: 'satellite', label: 'Uydu Bayi' }],
            }]}
          />

          {/* Temas Kanalları */}
          <Column
            title="Temas Kanalları"
            items={sortedChannels}
            onAdd={addChannel}
            onSave={saveChannel}
            onDelete={deleteChannel}
            onToggleActive={toggleChannelActive}
            addPlaceholder="Yeni kanal adı"
            renderItem={(item, isSelected) => (
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color as string }} />
                <span className={`text-sm ${isSelected ? 'text-indigo-700 font-semibold' : 'text-gray-800'}`}>{item.name}</span>
                {!item.is_active && (
                  <span className="ml-auto text-[9px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">pasif</span>
                )}
              </div>
            )}
            editFields={[{ key: 'color', label: 'Renk', type: 'color' }]}
          />

          {/* Satış Aşamaları */}
          <Column
            title="Satış Aşamaları"
            items={stages}
            onAdd={addStage}
            onSave={saveStage}
            onDelete={deleteStage}
            addPlaceholder="Yeni aşama adı"
            renderItem={(item, isSelected) => (
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color as string }} />
                <span className={`text-sm ${isSelected ? 'text-indigo-700 font-semibold' : 'text-gray-800'}`}>{item.name}</span>
                <span className="text-[10px] text-gray-400 ml-auto shrink-0">#{item.sort_order as number}</span>
              </div>
            )}
            editFields={[
              { key: 'color', label: 'Renk', type: 'color' },
              { key: 'sort_order', label: 'Sıra', type: 'number' },
            ]}
          />

        </div>
      </div>

      {/* ── Satış Yapılamadı Sebepleri ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <XCircle className="h-5 w-5 text-red-400" />
          <h2 className="text-base font-bold text-gray-900">Satış Yapılamadı Sebepleri</h2>
        </div>
        <div className="flex gap-4 flex-wrap">
          <Column
            title="Sebepler"
            items={lostReasons}
            onAdd={addLostReason}
            onSave={saveLostReason}
            onDelete={deleteLostReason}
            addPlaceholder="Yeni sebep ekle"
            renderItem={(item, isSelected) => (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                <span className={`text-sm ${isSelected ? 'text-indigo-700 font-semibold' : 'text-gray-800'}`}>{item.name}</span>
              </div>
            )}
            editFields={[{ key: 'sort_order', label: 'Sıra', type: 'number' }]}
          />
        </div>
      </div>

    </div>
  )
}
