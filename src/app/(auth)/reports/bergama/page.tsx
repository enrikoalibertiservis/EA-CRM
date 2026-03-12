import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { BrandFunnel } from '@/components/charts/brand-funnel'
import { ContactHeatmap } from '@/components/charts/contact-heatmap'
import { ChannelChart } from '@/components/charts/channel-chart'
import { ActivityChart } from '@/components/charts/activity-chart'
import { MapPin, Users, CheckCircle, XCircle, MessageSquare, TrendingUp } from 'lucide-react'
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

const BERGAMA_LOCATION_ID = '00000000-0000-0000-0000-000000000002'

export default async function BergamaReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, location:locations(*)')
    .eq('id', user!.id)
    .single()

  // Only super_admin can view Bergama report
  if (profile?.role !== 'super_admin') {
    redirect('/dashboard')
  }

  const { data: brands } = await supabase.from('brands').select('*').eq('is_active', true)
  const { data: stages } = await supabase.from('sales_stages').select('*').eq('is_active', true).order('sort_order')
  const { data: channels } = await supabase.from('contact_channels').select('*').eq('is_active', true).order('sort_order')

  // Bergama customers only
  const { data: customers } = await supabase
    .from('customers')
    .select('id, brand_id, current_stage_id, is_won, is_lost, created_at, consultant_id')
    .eq('is_active', true)
    .eq('location_id', BERGAMA_LOCATION_ID)

  // Bergama consultants
  const { data: consultants } = await supabase
    .from('user_profiles')
    .select('id, full_name, is_active')
    .eq('location_id', BERGAMA_LOCATION_ID)

  // Contact logs for Bergama customers
  const bergamaCustomerIds = (customers ?? []).map((c) => c.id)

  const { data: contactLogs } = bergamaCustomerIds.length > 0
    ? await supabase
        .from('contact_logs')
        .select('id, channel_id, contact_date, created_by')
        .in('customer_id', bergamaCustomerIds)
    : { data: [] }

  // Recent Bergama customers
  const { data: recentCustomers } = await supabase
    .from('customers')
    .select('id, full_name, created_at, brand:brands(name, color), current_stage:sales_stages(name, color)')
    .eq('is_active', true)
    .eq('location_id', BERGAMA_LOCATION_ID)
    .order('created_at', { ascending: false })
    .limit(10)

  // Consultant performance
  const consultantPerf = (consultants ?? []).map((c) => {
    const custCount = (customers ?? []).filter((cu) => cu.consultant_id === c.id).length
    const wonCount = (customers ?? []).filter((cu) => cu.consultant_id === c.id && cu.is_won).length
    const contactCount = (contactLogs ?? []).filter((l) => l.created_by === c.id).length
    return { ...c, custCount, wonCount, contactCount }
  }).sort((a, b) => b.custCount - a.custCount)

  // Brand funnel data (Bergama only)
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

  // Heatmap
  const heatmapData: HeatmapCell[] = []
  if (contactLogs) {
    const cellMap = new Map<string, number>()
    contactLogs.forEach((log) => {
      const date = new Date(log.contact_date)
      const day = (date.getDay() + 6) % 7
      const hour = date.getHours()
      const key = `${day}-${hour}`
      cellMap.set(key, (cellMap.get(key) ?? 0) + 1)
    })
    cellMap.forEach((count, key) => {
      const [day, hour] = key.split('-').map(Number)
      heatmapData.push({ day, hour, count })
    })
  }

  // Channel stats
  const channelStats: ChannelStats[] = (channels ?? []).map((channel: ContactChannel) => {
    const count = (contactLogs ?? []).filter((l) => l.channel_id === channel.id).length
    return { channel, count, percentage: 0 }
  }).filter((s: ChannelStats) => s.count > 0)
  const total = channelStats.reduce((sum: number, s: ChannelStats) => sum + s.count, 0)
  channelStats.forEach((s: ChannelStats) => { s.percentage = total > 0 ? (s.count / total) * 100 : 0 })
  channelStats.sort((a: ChannelStats, b: ChannelStats) => b.count - a.count)

  // Activity chart (last 30 days)
  const activityData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const label = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
    const dateStr = d.toISOString().split('T')[0]
    const count = (contactLogs ?? []).filter((l) => l.contact_date.startsWith(dateStr)).length
    return { label, count }
  })

  // Conversion rates by stage
  const stageConversions = (stages ?? []).map((stage: SalesStage) => {
    const atStage = (customers ?? []).filter((c) => c.current_stage_id === stage.id).length
    return { stage, count: atStage }
  })

  const totalCustomers = customers?.length ?? 0
  const wonCustomers = customers?.filter((c) => c.is_won).length ?? 0
  const lostCustomers = customers?.filter((c) => c.is_lost).length ?? 0
  const activeCustomers = totalCustomers - wonCustomers - lostCustomers
  const conversionRate = totalCustomers > 0 ? ((wonCustomers / totalCustomers) * 100).toFixed(1) : '0.0'

  return (
    <div>
      <Topbar
        title="Bergama Şube Raporu"
        subtitle="Uydu bayi detaylı performans analizi"
        actions={
          <Link href="/reports/main" className="text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg px-3 h-8 flex items-center">
            Merkez Raporu
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Header badge */}
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <MapPin className="h-4 w-4 text-emerald-600" />
          <p className="text-sm text-emerald-800 font-medium">Bergama Şube — Uydu Bayi Analizi</p>
          <span className="ml-auto text-xs text-emerald-600">Sadece super admin görür</span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Toplam Müşteri', value: totalCustomers, icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Aktif Takip', value: activeCustomers, icon: TrendingUp, color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Kazanılan', value: wonCustomers, icon: CheckCircle, color: '#10B981', bg: '#ECFDF5' },
            { label: 'Kaybedilen', value: lostCustomers, icon: XCircle, color: '#EF4444', bg: '#FEF2F2' },
            { label: 'Toplam Temas', value: contactLogs?.length ?? 0, icon: MessageSquare, color: '#8B5CF6', bg: '#F5F3FF' },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: stat.bg }}>
                  <Icon className="h-4 w-4" style={{ color: stat.color }} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Conversion rate highlight */}
        <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2D5A8E] rounded-xl p-5 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/60 text-sm">Bergama Dönüşüm Oranı</p>
              <p className="text-4xl font-bold mt-1">%{conversionRate}</p>
              <p className="text-white/60 text-xs mt-1">{wonCustomers} kazanılan / {totalCustomers} toplam müşteri</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Aktif Danışman Sayısı</p>
              <p className="text-2xl font-bold">{consultants?.filter((c) => c.is_active).length ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Brand Funnels */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Bergama — Marka Bazlı Huni</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {brandFunnelData.filter((d) => d.total > 0).map((d) => (
              <BrandFunnel key={d.brand.id} data={d} />
            ))}
            {brandFunnelData.every((d) => d.total === 0) && (
              <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
                Bergama şubesinde henüz müşteri kaydı bulunmuyor
              </div>
            )}
          </div>
        </div>

        {/* Consultant Performance */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Danışman Performansı</h2>
          {consultantPerf.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Danışman bulunamadı</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Danışman</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Müşteri</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Kazanılan</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Temas</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Dönüşüm</th>
                  </tr>
                </thead>
                <tbody>
                  {consultantPerf.map((c, i) => (
                    <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-xs font-bold">
                            {c.full_name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">{c.full_name}</span>
                          {!c.is_active && <span className="text-xs text-gray-400">(Pasif)</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-gray-900">{c.custCount}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-semibold text-green-600">{c.wonCount}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-600">{c.contactCount}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-semibold">
                          {c.custCount > 0 ? `%${((c.wonCount / c.custCount) * 100).toFixed(0)}` : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Heatmap + Channel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ContactHeatmap data={heatmapData} title="Bergama — İletişim Yoğunluğu (Gün/Saat)" />
          </div>
          <div>
            <ChannelChart data={channelStats} title="Bergama — Temas Kanalları" />
          </div>
        </div>

        {/* Activity (30 days) */}
        <ActivityChart data={activityData} title="Bergama — Son 30 Gün Temas Aktivitesi" color="#10B981" />

        {/* Recent customers */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Bergama Son Müşteriler</h2>
          {!recentCustomers || recentCustomers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Henüz müşteri yok</p>
          ) : (
            <div className="space-y-1.5">
              {recentCustomers.map((c) => {
                const brand = Array.isArray(c.brand) ? c.brand[0] : c.brand
                const stage = Array.isArray(c.current_stage) ? c.current_stage[0] : c.current_stage
                return (
                  <Link
                    key={c.id}
                    href={`/customers/${c.id}`}
                    className="flex items-center gap-2.5 py-2 px-2 hover:bg-gray-50 rounded-lg transition-colors -mx-2"
                  >
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: brand?.color ?? '#6B7280' }}
                    >
                      {c.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{c.full_name}</p>
                      <p className="text-xs text-gray-400">{brand?.name} · {formatDate(c.created_at)}</p>
                    </div>
                    {stage && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stage.color + '22', color: stage.color }}
                      >
                        {stage.name}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
