import { createClient } from '@/lib/supabase/server'
import { BrandFunnel } from '@/components/charts/brand-funnel'

export const dynamic = 'force-dynamic'
import { ContactHeatmap } from '@/components/charts/contact-heatmap'
import { ChannelChart } from '@/components/charts/channel-chart'
import { ActivityChart } from '@/components/charts/activity-chart'
import {
  Users, MessageSquare, CheckCircle, Clock, UserPlus, FileText,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate } from '@/lib/utils'
import type { Brand, SalesStage, BrandFunnelData, HeatmapCell, ChannelStats, ContactChannel } from '@/lib/types/database'
import { QuickRegister } from '@/components/customers/quick-register'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles').select('*, location:locations(*)').eq('id', user!.id).single()

  const { data: brands } = await supabase.from('brands').select('*').eq('is_active', true).order('name')
  const { data: models } = await supabase.from('vehicle_models').select('id, brand_id, name').eq('is_active', true).order('sort_order')
  const { data: stages } = await supabase.from('sales_stages').select('*').eq('is_active', true).order('sort_order')
  const { data: customers } = await supabase.from('customers').select('id, brand_id, current_stage_id, is_won, is_lost, created_at, consultant_id, location_id, brand:brands(id, name, color)').eq('is_active', true)
  const { data: contactLogs } = await supabase.from('contact_logs').select('id, channel_id, contact_date, created_by')
  const { data: channels } = await supabase.from('contact_channels').select('*').eq('is_active', true).order('sort_order')
  const { data: recentCustomers } = await supabase
    .from('customers')
    .select('id, full_name, phone, created_at, brand:brands(name, color), current_stage:sales_stages(name, color, slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5)

  const brandFunnelData: BrandFunnelData[] = (brands ?? []).map((brand: Brand) => {
    const bc = (customers ?? []).filter((c) => c.brand_id === brand.id)
    return {
      brand,
      stages: (stages ?? []).map((stage: SalesStage) => ({ stage, count: bc.filter((c) => c.current_stage_id === stage.id).length })),
      total: bc.length,
      won: bc.filter((c) => c.is_won).length,
      lost: bc.filter((c) => c.is_lost).length,
    }
  })

  const heatmapData: HeatmapCell[] = []
  if (contactLogs) {
    const cellMap = new Map<string, number>()
    contactLogs.forEach((log) => {
      const d = new Date(log.contact_date)
      const key = `${(d.getDay() + 6) % 7}-${d.getHours()}`
      cellMap.set(key, (cellMap.get(key) ?? 0) + 1)
    })
    cellMap.forEach((count, key) => {
      const [day, hour] = key.split('-').map(Number)
      heatmapData.push({ day, hour, count })
    })
  }

  const channelStats: ChannelStats[] = (channels ?? []).map((ch: ContactChannel) => {
    const count = (contactLogs ?? []).filter((l) => l.channel_id === ch.id).length
    return { channel: ch, count, percentage: 0 }
  }).filter((s: ChannelStats) => s.count > 0)
  const totalContacts = channelStats.reduce((sum: number, s: ChannelStats) => sum + s.count, 0)
  channelStats.forEach((s: ChannelStats) => { s.percentage = totalContacts > 0 ? (s.count / totalContacts) * 100 : 0 })
  channelStats.sort((a: ChannelStats, b: ChannelStats) => b.count - a.count)

  const activityData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    const label = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
    const dateStr = d.toISOString().split('T')[0]
    const count = (contactLogs ?? []).filter((l) => l.contact_date.startsWith(dateStr)).length
    return { label, count }
  })

  const totalCustomers = customers?.length ?? 0
  const activeCustomers = customers?.filter((c) => !c.is_won && !c.is_lost).length ?? 0
  const wonCustomers = customers?.filter((c) => c.is_won).length ?? 0
  const totalContactCount = contactLogs?.length ?? 0
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Kullanıcı'
  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const statCards = [
    { label: 'MÜŞTERİLER', value: totalCustomers, sub: 'toplam müşteri', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', dot: 'bg-blue-500' },
    { label: 'AKTİF TAKİP', value: activeCustomers, sub: 'devam ediyor', icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', dot: 'bg-teal-500' },
    { label: 'KAZANILAN', value: wonCustomers, sub: 'satış tamamlandı', icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', dot: 'bg-amber-500' },
    { label: 'TEMAS', value: totalContactCount, sub: 'toplam temas', icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', dot: 'bg-violet-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 px-6 py-8 text-white shadow-lg min-h-[110px]">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 right-20 w-28 h-28 rounded-full bg-indigo-800/30" />
        <div className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full bg-white/5" />

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">{today}</p>
            <h1 className="text-2xl font-bold">Hoş Geldiniz, {firstName} 👋</h1>
            <p className="text-blue-200 text-sm mt-1">
              {profile?.role === 'super_admin' ? 'Yönetici Paneli' : profile?.role === 'manager' ? 'Satış Müdürü Paneli' : 'Danışman Paneli'}
            </p>
          </div>
          <Link href="/customers/new"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-gray-900 shadow-lg shadow-amber-500/50 hover:bg-amber-300 hover:scale-105 transition-all text-sm">
            <UserPlus className="h-4 w-4" />
            Yeni Müşteri
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`flex items-center gap-4 rounded-xl border ${s.border} ${s.bg} px-4 py-3.5 shadow-sm`}>
              <div className={`rounded-lg bg-white/80 p-2.5 shadow-sm ${s.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold leading-tight text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
              </div>
              <div className="flex flex-col gap-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`w-1.5 rounded-full opacity-30 ${s.dot}`} style={{ height: `${8 + i * 4}px` }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Brand Funnels + Quick Register — equal boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
        {brandFunnelData
          .filter((d) => d.brand.slug !== 'ikinci-el' && !d.brand.name.toLowerCase().includes('ikinci'))
          .map((d) => <BrandFunnel key={d.brand.id} data={d} />)}
        <QuickRegister
          brands={(brands ?? []).filter((b) => b.slug !== 'ikinci-el' && !b.name.toLowerCase().includes('ikinci'))}
          models={models ?? []}
          currentUserId={user!.id}
          currentLocationId={profile?.location_id ?? ''}
        />
      </div>

      {/* Heatmap + Channel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ContactHeatmap customers={(customers ?? []) as never[]} />
        <ChannelChart data={channelStats} />
      </div>

      {/* Activity + Recent Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 flex">
          <ActivityChart data={activityData} title="Son 14 Gün — Günlük Temas Aktivitesi" className="flex-1" />
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.04] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Son Müşteriler</h3>
            </div>
            <Link href="/customers" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Tümünü Gör →
            </Link>
          </div>

          {/* Her zaman 5 satır — boş satırlar yer tutar */}
          <div className="flex-1 flex flex-col justify-between">
            {Array.from({ length: 5 }).map((_, i) => {
              const c = (recentCustomers ?? [])[i]
              if (!c) {
                return (
                  <div key={`empty-${i}`} className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-xl opacity-0 pointer-events-none">
                    <div className="h-8 w-8 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1"><p className="text-sm text-gray-100">—</p></div>
                  </div>
                )
              }
              const brand = Array.isArray(c.brand) ? c.brand[0] : c.brand
              const stage = Array.isArray(c.current_stage) ? c.current_stage[0] : c.current_stage
              return (
                <Link key={c.id} href={`/customers/${c.id}`}
                  className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: brand?.color ?? '#6B7280' }}>
                    {c.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.full_name}</p>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      {brand?.name && (() => {
                        const logos: Record<string, string> = { 'Fiat': '/brands/fiat.png', 'Alfa Romeo': '/brands/alfa-romeo.png', 'Jeep': '/brands/jeep.png' }
                        const logo = logos[brand.name]
                        return logo ? (
                          <Image src={logo} alt={brand.name} width={14} height={14} className="object-contain opacity-70" style={{ mixBlendMode: 'multiply' }} />
                        ) : null
                      })()}
                      {brand?.name} · {formatDate(c.created_at)}
                    </div>
                  </div>
                  {stage && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0"
                      style={{ backgroundColor: stage.color + '15', color: stage.color, borderColor: stage.color + '30' }}>
                      {stage.name}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
