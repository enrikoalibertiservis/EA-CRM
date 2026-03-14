import { createClient } from '@/lib/supabase/server'
import { BrandFunnel } from '@/components/charts/brand-funnel'

export const dynamic = 'force-dynamic'
import { ContactHeatmap } from '@/components/charts/contact-heatmap'
import { ChannelChart } from '@/components/charts/channel-chart'
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
  const { data: locations } = await supabase.from('locations').select('id, name').order('name')
  const { data: stages } = await supabase.from('sales_stages').select('*').eq('is_active', true).order('sort_order')
  const { data: customers } = await supabase.from('customers').select('id, brand_id, current_stage_id, is_won, is_lost, created_at, consultant_id, location_id, source_channel_id, brand:brands(id, name, color), source_channel:contact_channels(id, name, slug, icon_name, color)').eq('is_active', true)
  const { data: contactLogs } = await supabase.from('contact_logs').select('id, channel_id, contact_date, created_by')
  const { data: channels } = await supabase.from('contact_channels').select('*').eq('is_active', true).order('sort_order')

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

  // channelStats: müşterilerin source_channel'ından hesapla
  const channelCountMap: Record<string, { channel: ContactChannel; count: number; percentage: number }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(customers ?? []).forEach((c: any) => {
    const ch = c.source_channel as ContactChannel | undefined
    if (!ch?.id) return
    if (!channelCountMap[ch.id]) channelCountMap[ch.id] = { channel: ch, count: 0, percentage: 0 }
    channelCountMap[ch.id].count++
  })
  const channelStats: ChannelStats[] = Object.values(channelCountMap).filter(x => x.count > 0)
  const totalContacts = channelStats.reduce((sum: number, s: ChannelStats) => sum + s.count, 0)
  channelStats.forEach((s: ChannelStats) => { s.percentage = totalContacts > 0 ? (s.count / totalContacts) * 100 : 0 })
  channelStats.sort((a: ChannelStats, b: ChannelStats) => b.count - a.count)


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

      {/* Quick Register + Brand Funnels — QuickRegister sol üstte */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
        <QuickRegister
          brands={(brands ?? []).filter((b) => b.slug !== 'ikinci-el' && !b.name.toLowerCase().includes('ikinci'))}
          models={models ?? []}
          locations={locations ?? []}
          currentUserId={user!.id}
          currentLocationId={profile?.location_id ?? ''}
        />
        {brandFunnelData
          .filter((d) => d.brand.slug !== 'ikinci-el' && !d.brand.name.toLowerCase().includes('ikinci'))
          .map((d) => <BrandFunnel key={d.brand.id} data={d} />)}
      </div>

      {/* Heatmap + Channel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ContactHeatmap
          customers={(customers ?? []) as never[]}
          locations={locations ?? []}
        />
        <ChannelChart data={channelStats} />
      </div>

    </div>
  )
}
