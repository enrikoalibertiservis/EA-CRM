'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Settings, Car, MapPin, Phone, Tag, Plus, Pencil, Trash2, X, Check,
  Shield, Building2, Layers, Palette,
} from 'lucide-react'
import { toast } from 'sonner'

interface ParamItem { id: string; [key: string]: unknown }

function SectionHeader({ icon: Icon, color, bg, title, count }: { icon: React.ElementType; color: string; bg: string; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{count}</span>
    </div>
  )
}

export default function SettingsPage() {
  const supabase = createClient()
  const [myRole, setMyRole] = useState('')
  const [loading, setLoading] = useState(true)

  const [brands, setBrands] = useState<ParamItem[]>([])
  const [models, setModels] = useState<ParamItem[]>([])
  const [locations, setLocations] = useState<ParamItem[]>([])
  const [channels, setChannels] = useState<ParamItem[]>([])
  const [stages, setStages] = useState<ParamItem[]>([])

  const loadAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    setMyRole(p?.role ?? '')
    if (p?.role !== 'super_admin') { setLoading(false); return }

    const [b, m, l, c, s] = await Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase.from('vehicle_models').select('*, brand:brands(id, name, color)').order('sort_order'),
      supabase.from('locations').select('*').order('name'),
      supabase.from('contact_channels').select('*').order('sort_order'),
      supabase.from('sales_stages').select('*').order('sort_order'),
    ])
    setBrands(b.data ?? [])
    setModels(m.data ?? [])
    setLocations(l.data ?? [])
    setChannels(c.data ?? [])
    setStages(s.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadAll() }, [loadAll])

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
  if (myRole !== 'super_admin') return <div className="flex flex-col items-center justify-center py-20 text-gray-400"><Shield className="h-12 w-12 mb-3 opacity-30" /><p className="text-sm font-medium">Erişim yetkiniz yok</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Sistem Ayarları</h1>
          <p className="text-xs text-gray-500">Parametrik verileri yönetin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Brands */}
        <ParamCard
          icon={Car} color="text-red-600" bg="bg-red-50" title="Markalar"
          items={brands} setItems={setBrands} table="brands"
          fields={[
            { key: 'name', label: 'Marka Adı', type: 'text', required: true },
            { key: 'slug', label: 'Slug', type: 'text', required: true },
            { key: 'color', label: 'Renk', type: 'color', required: true },
          ]}
          defaults={{ name: '', slug: '', color: '#3B82F6', text_color: '#FFFFFF', is_active: true }}
          displayFn={(item) => (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color as string }} />
              <span className="text-sm font-medium text-gray-900">{item.name as string}</span>
            </div>
          )}
          supabase={supabase}
        />

        {/* Vehicle Models */}
        <ParamCard
          icon={Layers} color="text-blue-600" bg="bg-blue-50" title="Araç Modelleri"
          items={models} setItems={setModels} table="vehicle_models"
          fields={[
            { key: 'name', label: 'Model Adı', type: 'text', required: true },
            { key: 'brand_id', label: 'Marka', type: 'select', required: true, options: brands.map(b => ({ value: b.id as string, label: b.name as string })) },
          ]}
          defaults={{ name: '', brand_id: brands[0]?.id ?? '', is_active: true, sort_order: 0 }}
          displayFn={(item) => {
            const brand = (item as Record<string, unknown>).brand as Record<string, unknown> | null
            return (
              <div className="flex items-center gap-2">
                {brand && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0" style={{ color: brand.color as string, borderColor: (brand.color as string) + '40', backgroundColor: (brand.color as string) + '10' }}>{brand.name as string}</span>}
                <span className="text-sm font-medium text-gray-900">{item.name as string}</span>
              </div>
            )
          }}
          supabase={supabase}
          groupBy={{ key: 'brand_id', items: brands, labelKey: 'name' }}
        />

        {/* Locations */}
        <ParamCard
          icon={Building2} color="text-indigo-600" bg="bg-indigo-50" title="Lokasyonlar"
          items={locations} setItems={setLocations} table="locations"
          fields={[
            { key: 'name', label: 'Lokasyon Adı', type: 'text', required: true },
            { key: 'type', label: 'Tür', type: 'select', required: true, options: [{ value: 'main', label: 'Ana Bayi' }, { value: 'satellite', label: 'Uydu Bayi' }] },
            { key: 'address', label: 'Adres', type: 'text' },
            { key: 'phone', label: 'Telefon', type: 'text' },
          ]}
          defaults={{ name: '', type: 'main', address: '', phone: '' }}
          displayFn={(item) => (
            <div className="flex items-center gap-2">
              {item.type === 'main' ? <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> : <MapPin className="h-3.5 w-3.5 text-teal-500 shrink-0" />}
              <span className="text-sm font-medium text-gray-900">{item.name as string}</span>
              <span className="text-[10px] text-gray-400">{item.type === 'main' ? 'Ana' : 'Uydu'}</span>
            </div>
          )}
          supabase={supabase}
        />

        {/* Contact Channels */}
        <ParamCard
          icon={Phone} color="text-green-600" bg="bg-green-50" title="Temas Kanalları"
          items={channels} setItems={setChannels} table="contact_channels"
          fields={[
            { key: 'name', label: 'Kanal Adı', type: 'text', required: true },
            { key: 'slug', label: 'Slug', type: 'text', required: true },
            { key: 'color', label: 'Renk', type: 'color', required: true },
          ]}
          defaults={{ name: '', slug: '', icon_name: 'phone', color: '#6B7280', is_active: true, sort_order: 0 }}
          displayFn={(item) => (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color as string }} />
              <span className="text-sm font-medium text-gray-900">{item.name as string}</span>
            </div>
          )}
          supabase={supabase}
        />

        {/* Sales Stages */}
        <ParamCard
          icon={Tag} color="text-amber-600" bg="bg-amber-50" title="Satış Aşamaları"
          items={stages} setItems={setStages} table="sales_stages"
          fields={[
            { key: 'name', label: 'Aşama Adı', type: 'text', required: true },
            { key: 'slug', label: 'Slug', type: 'text', required: true },
            { key: 'color', label: 'Renk', type: 'color', required: true },
            { key: 'sort_order', label: 'Sıra', type: 'number', required: true },
          ]}
          defaults={{ name: '', slug: '', icon_name: 'circle', color: '#6B7280', sort_order: 0, is_active: true, is_final: false }}
          displayFn={(item) => (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color as string }} />
              <span className="text-sm font-medium text-gray-900">{item.name as string}</span>
              <span className="text-[10px] text-gray-400 ml-auto">#{item.sort_order as number}</span>
            </div>
          )}
          supabase={supabase}
        />
      </div>
    </div>
  )
}

/* ─── Generic Parametric CRUD Card ─── */

interface Field {
  key: string; label: string; type: 'text' | 'color' | 'number' | 'select'; required?: boolean
  options?: { value: string; label: string }[]
}
interface GroupBy { key: string; items: ParamItem[]; labelKey: string }
interface ParamCardProps {
  icon: React.ElementType; color: string; bg: string; title: string
  items: ParamItem[]; setItems: (fn: (prev: ParamItem[]) => ParamItem[]) => void
  table: string; fields: Field[]; defaults: Record<string, unknown>
  displayFn: (item: ParamItem) => React.ReactNode
  supabase: ReturnType<typeof createClient>
  groupBy?: GroupBy
}

function ParamCard({ icon, color, bg, title, items, setItems, table, fields, defaults, displayFn, supabase, groupBy }: ParamCardProps) {
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>({})

  const startAdd = () => { setForm({ ...defaults }); setAdding(true); setEditId(null) }
  const startEdit = (item: ParamItem) => {
    const f: Record<string, unknown> = {}
    fields.forEach(fd => { f[fd.key] = item[fd.key] ?? '' })
    setForm(f); setEditId(item.id); setAdding(false)
  }
  const cancel = () => { setAdding(false); setEditId(null); setForm({}) }

  const save = async () => {
    for (const f of fields) {
      if (f.required && !form[f.key]) { toast.error(`${f.label} zorunlu`); return }
    }

    if (adding) {
      const insertData: Record<string, unknown> = {}
      Object.keys(defaults).forEach(k => { insertData[k] = form[k] ?? defaults[k] })
      const selectQuery = table === 'vehicle_models' ? '*, brand:brands(id, name, color)' : '*'
      const { data, error } = await supabase.from(table).insert(insertData).select(selectQuery).single()
      if (error) { toast.error(error.message); return }
      setItems(prev => [...prev, data as unknown as ParamItem])
      toast.success('Eklendi')
    } else if (editId) {
      const updateData: Record<string, unknown> = {}
      fields.forEach(f => { updateData[f.key] = form[f.key] })
      const { error } = await supabase.from(table).update(updateData).eq('id', editId)
      if (error) { toast.error(error.message); return }
      setItems(prev => prev.map(i => i.id === editId ? { ...i, ...updateData } : i))
      toast.success('Güncellendi')
    }
    cancel()
  }

  const remove = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { toast.error('Silinemedi: ' + error.message); return }
    setItems(prev => prev.filter(i => i.id !== id))
    toast.success('Silindi')
  }

  const isFormOpen = adding || editId

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.04] p-5">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader icon={icon} color={color} bg={bg} title={title} count={items.length} />
        {!isFormOpen && (
          <button onClick={startAdd} className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="h-3 w-3" /> Ekle
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isFormOpen && (
        <div className="mb-3 p-3 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {fields.map(f => (
              <div key={f.key} className={f.type === 'color' ? 'col-span-1' : ''}>
                <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">{f.label}</label>
                {f.type === 'select' ? (
                  <select value={(form[f.key] ?? '') as string} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full h-8 rounded border border-gray-200 bg-white text-xs px-2 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="">Seçiniz</option>
                    {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'color' ? (
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={(form[f.key] ?? '#000000') as string} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="h-8 w-10 rounded border border-gray-200 cursor-pointer" />
                    <input type="text" value={(form[f.key] ?? '') as string} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="flex-1 h-8 rounded border border-gray-200 bg-white text-xs px-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                ) : (
                  <input type={f.type} value={(form[f.key] ?? '') as string} onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="w-full h-8 rounded border border-gray-200 bg-white text-xs px-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 justify-end pt-1">
            <button onClick={cancel} className="h-7 px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">İptal</button>
            <button onClick={save} className="h-7 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1">
              <Check className="h-3 w-3" /> {adding ? 'Ekle' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-0.5 max-h-[320px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Henüz kayıt yok</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-lg hover:bg-gray-50 group transition-colors">
              <div className="flex-1 min-w-0">{displayFn(item)}</div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(item)} className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                  <Pencil className="h-3 w-3" />
                </button>
                <button onClick={() => remove(item.id)} className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
