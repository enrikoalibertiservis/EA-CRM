import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/topbar'
import { BrandFunnel } from '@/components/charts/brand-funnel'
import { ContactHeatmap } from '@/components/charts/contact-heatmap'
import { ChannelChart } from '@/components/charts/channel-chart'
import { ActivityChart } from '@/components/charts/activity-chart'
import { Users, TrendingUp, MessageSquare, CheckCircle, Clock, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type {
  Brand,
  SalesStage,
  BrandFunnelData,
  HeatmapCell,
  ChannelStats,
  ContactChannel,
} from '@/lib/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, location:locations(*)')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'super_admin'
  const isManager = profile?.role === 'manager'
  const locationId = profile?.location_id

  // Fetch brands and stages
  const { data: brands } = await supabase.from('brands').select('*').eq('is_active', true).order('name')
  const { data: stages } = await supabase.from('sales_stages').select('*').eq('is_active', true).order('sort_order')

  // Customers query (with RLS)
  const customersQuery = supabase
    .from('customers')
    .select('id, brand_id, current_stage_id, is_won, is_lost, created_at, consultant_id, location_id')
    .eq('is_active', true)

  const { data: customers } = await customersQuery

  // Contact logs for heatmap & channel stats
  const logsQuery = supabase
    .from('contact_logs')
    .select('id, channel_id, contact_date, created_by')

  const { data: contactLogs } = await logsQuery

  // Recent customers
  const { data: recentCustomers } = await supabase
    .from('customers')
    .select('id, full_name, phone, brand_id, current_stage_id, created_at, brand:brands(name, color), current_stage:sales_stages(name, color)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(8)

  // Contact channels
  const { data: channels } = await supabase
    .from('contact_channels')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  // ── Build brand funnel data ──
  const brandFunnelData: BrandFunnelData[] = (brands ?? []).map((brand: Brand) => {
    const brandCustomers = (customers ?? []).filter((c) => c.brand_id === brand.id)
    return {
      brand,
      stages: (stages ?? []).map((stage: SalesStage) => ({
        stage,
        count: brandCustomers.filter((c) => c.current_stage_id === stage.id).length,
      })),
      total: brandCustomers.length,
      won: brandCustomers.filter((c) => c.is_won).length,
      lost: brandCustomers.filter((c) => c.is_lost).length,
    }
  })

  // ── Build heatmap data ──
  const heatmapData: HeatmapCell[] = []
  if (contactLogs) {
    const cellMap = new Map<string, number>()
    contactLogs.forEach((log) => {
      const date = new Date(log.contact_date)
      const day = (date.getDay() + 6) % 7 // 0=Mon
      const hour = date.getHours()
      const key = `${day}-${hour}`
      cellMap.set(key, (cellMap.get(key) ?? 0) + 1)
    })
    cellMap.forEach((count, key) => {
      const [day, hour] = key.split('-').map(Number)
      heatmapData.push({ day, hour, count })
    })
  }

  // ── Build channel stats ──
  const channelStats: ChannelStats[] = (channels ?? []).map((channel: ContactChannel) => {
    const count = (contactLogs ?? []).filter((l) => l.channel_id === channel.id).length
    return { channel, count, percentage: 0 }
  }).filter((s: ChannelStats) => s.count > 0)
  const totalContacts = channelStats.reduce((sum: number, s: ChannelStats) => sum + s.count, 0)
  channelStats.forEach((s: ChannelStats) => { s.percentage = totalContacts > 0 ? (s.count / totalContacts) * 100 : 0 })
  channelStats.sort((a: ChannelStats, b: ChannelStats) => b.count - a.count)

  // ── Build daily activity (last 14 days) ──
  const activityData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const label = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
    const dateStr = d.toISOString().split('T')[0]
    const count = (contactLogs ?? []).filter((l) => l.contact_date.startsWith(dateStr)).length
    return { label, count }
  })

  // ── Summary stats ──
  const totalCustomers = customers?.length ?? 0
  const activeCustomers = customers?.filter((c) => !c.is_won && !c.is_lost).length ?? 0
  const wonCustomers = customers?.filter((c) => c.is_won).length ?? 0
  const totalContactCount = contactLogs?.length ?? 0

  const stats = [
    { label: 'Toplam Müşteri', value: totalCustomers, icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Aktif Takip', value: activeCustomers, icon: Clock, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Kazanılan', value: wonCustomers, icon: CheckCircle, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Toplam Temas', value: totalContactCount, icon: MessageSquare, color: '#8B5CF6', bg: '#F5F3FF' },
  ]

  return (
    <div>
      <Topbar
        title="Dashboard"
        subtitle={`${profile?.location?.name ?? ''} • ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        actions={
          <Link
            href="/customers/new"
            className="flex items-center gap-1.5 h-8 px-3 bg-[#1E3A5F] text-white text-xs font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Yeni Müşteri
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: stat.bg }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: stat.color }} />
                  </div>
                  <TrendingUp className="h-4 w-4 text-gray-300" />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-3">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Brand Funnels */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Marka Bazlı Satış Hunisi</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {brandFunnelData.map((d) => (
              <BrandFunnel key={d.brand.id} data={d} />
            ))}
          </div>
        </div>

        {/* Heatmap + Channel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ContactHeatmap data={heatmapData} />
          </div>
          <div>
            <ChannelChart data={channelStats} />
          </div>
        </div>

        {/* Activity Chart + Recent Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ActivityChart data={activityData} title="Son 14 Gün - Günlük Temas Aktivitesi" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Son Eklenen Müşteriler</h3>
            <div className="space-y-2">
              {(recentCustomers ?? []).slice(0, 6).map((c) => {
                const brand = Array.isArray(c.brand) ? c.brand[0] : c.brand
                const stage = Array.isArray(c.current_stage) ? c.current_stage[0] : c.current_stage
                return (
                  <Link
                    key={c.id}
                    href={`/customers/${c.id}`}
                    className="flex items-center gap-2.5 py-1.5 hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors"
                  >
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: brand?.color ?? '#6B7280' }}
                    >
                      {c.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{c.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{brand?.name} · {formatDate(c.created_at)}</p>
                    </div>
                    {stage && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: stage.color + '22',
                          color: stage.color,
                        }}
                      >
                        {stage.name}
                      </span>
                    )}
                  </Link>
                )
              })}
              {(!recentCustomers || recentCustomers.length === 0) && (
                <p className="text-xs text-gray-400 text-center py-4">Henüz müşteri yok</p>
              )}
            </div>
            {(recentCustomers?.length ?? 0) > 0 && (
              <Link href="/customers" className="block text-center text-xs text-blue-600 hover:text-blue-700 mt-3 font-medium">
                Tümünü gör →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
