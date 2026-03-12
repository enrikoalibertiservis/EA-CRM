import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { BrandFunnel } from '@/components/charts/brand-funnel'
import { ContactHeatmap } from '@/components/charts/contact-heatmap'
import { ChannelChart } from '@/components/charts/channel-chart'
import { ActivityChart } from '@/components/charts/activity-chart'
import { Building2, Users, CheckCircle, MessageSquare, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import type { Brand, SalesStage, BrandFunnelData, HeatmapCell, ChannelStats, ContactChannel } from '@/lib/types/database'

const MAIN_LOCATION_ID = '00000000-0000-0000-0000-000000000001'

export default async function MainReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles').select('*, location:locations(*)').eq('id', user!.id).single()

  if (!['super_admin', 'manager'].includes(profile?.role ?? '')) redirect('/dashboard')

  // If manager, only show their location's data
  const locationFilter = profile?.role === 'manager' ? profile.location_id : MAIN_LOCATION_ID

  const [{ data: brands }, { data: stages }, { data: channels }] = await Promise.all([
    supabase.from('brands').select('*').eq('is_active', true),
    supabase.from('sales_stages').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('contact_channels').select('*').eq('is_active', true).order('sort_order'),
  ])

  const { data: customers } = await supabase
    .from('customers')
    .select('id, brand_id, current_stage_id, is_won, is_lost, created_at, consultant_id')
    .eq('is_active', true)
    .eq('location_id', locationFilter)

  const { data: consultants } = await supabase
    .from('user_profiles')
    .select('id, full_name, is_active')
    .eq('location_id', locationFilter)

  const customerIds = (customers ?? []).map((c) => c.id)
  const { data: contactLogs } = customerIds.length > 0
    ? await supabase.from('contact_logs').select('id, channel_id, contact_date, created_by').in('customer_id', customerIds)
    : { data: [] }

  // Brand funnels
  const brandFunnelData: BrandFunnelData[] = (brands ?? []).map((brand: Brand) => {
    const bc = (customers ?? []).filter((c) => c.brand_id === brand.id)
    return {
      brand,
      stages: (stages ?? []).map((stage: SalesStage) => ({
        stage,
        count: bc.filter((c) => c.current_stage_id === stage.id).length,
      })),
      total: bc.length,
      won: bc.filter((c) => c.is_won).length,
      lost: bc.filter((c) => c.is_lost).length,
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

  // 30-day activity
  const activityData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const label = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
    const dateStr = d.toISOString().split('T')[0]
    const count = (contactLogs ?? []).filter((l) => l.contact_date.startsWith(dateStr)).length
    return { label, count }
  })

  const totalCustomers = customers?.length ?? 0
  const wonCustomers = customers?.filter((c) => c.is_won).length ?? 0
  const lostCustomers = customers?.filter((c) => c.is_lost).length ?? 0
  const activeCustomers = totalCustomers - wonCustomers - lostCustomers
  const convRate = totalCustomers > 0 ? ((wonCustomers / totalCustomers) * 100).toFixed(1) : '0.0'

  const consultantPerf = (consultants ?? []).map((c) => {
    const custCount = (customers ?? []).filter((cu) => cu.consultant_id === c.id).length
    const wonCount = (customers ?? []).filter((cu) => cu.consultant_id === c.id && cu.is_won).length
    const contactCount = (contactLogs ?? []).filter((l) => l.created_by === c.id).length
    return { ...c, custCount, wonCount, contactCount }
  }).sort((a, b) => b.custCount - a.custCount)

  return (
    <div>
      <Topbar
        title="Merkez Raporu"
        subtitle={`${profile?.location?.name ?? 'Merkez Bayi'} — Detaylı Performans`}
        actions={
          profile?.role === 'super_admin' && (
            <Link href="/reports/bergama" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium border border-emerald-200 rounded-lg px-3 h-8 flex items-center">
              Bergama Raporu
            </Link>
          )
        }
      />

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Building2 className="h-4 w-4 text-blue-600" />
          <p className="text-sm text-blue-800 font-medium">{profile?.location?.name ?? 'Merkez Bayi'} — Rapor Dönemi</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Toplam Müşteri', value: totalCustomers, icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Aktif Takip', value: activeCustomers, icon: TrendingUp, color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Kazanılan', value: wonCustomers, icon: CheckCircle, color: '#10B981', bg: '#ECFDF5' },
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

        {/* Conversion highlight */}
        <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2D5A8E] rounded-xl p-5 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/60 text-sm">Dönüşüm Oranı</p>
              <p className="text-4xl font-bold mt-1">%{convRate}</p>
              <p className="text-white/60 text-xs mt-1">{wonCustomers} kazanılan / {totalCustomers} toplam</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Danışman</p>
              <p className="text-2xl font-bold">{consultants?.length ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Brand Funnels */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Marka Bazlı Satış Hunisi</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {brandFunnelData.map((d) => <BrandFunnel key={d.brand.id} data={d} />)}
          </div>
        </div>

        {/* Consultant Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Danışman Performansı</h2>
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
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold">{c.custCount}</td>
                    <td className="py-2.5 px-3 text-right text-green-600 font-semibold">{c.wonCount}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{c.contactCount}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">
                      {c.custCount > 0 ? `%${((c.wonCount / c.custCount) * 100).toFixed(0)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

        {/* Activity chart */}
        <ActivityChart data={activityData} title="Son 30 Gün Temas Aktivitesi" />
      </div>
    </div>
  )
}
