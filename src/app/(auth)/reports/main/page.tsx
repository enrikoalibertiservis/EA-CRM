import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BrandFunnel } from '@/components/charts/brand-funnel'
import { ContactHeatmap } from '@/components/charts/contact-heatmap'
import { ChannelChart } from '@/components/charts/channel-chart'
import { ActivityChart } from '@/components/charts/activity-chart'
import { Building2, Users, CheckCircle, MessageSquare, TrendingUp, Shield, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import type { Brand, SalesStage, BrandFunnelData, HeatmapCell, ChannelStats, ContactChannel } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

export default async function MainReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles').select('*, location:locations(*)').eq('id', user!.id).single()

  if (!['super_admin', 'manager'].includes(profile?.role ?? '')) redirect('/dashboard')

  // Ana lokasyonu type='main' ile bul (UUID bağımsız)
  const { data: mainLocationRow } = await supabase
    .from('locations').select('id, name').eq('type', 'main').single()

  // Manager → kendi lokasyonu, super_admin → main lokasyon
  const locationFilter = profile?.role === 'manager'
    ? profile.location_id
    : mainLocationRow?.id

  const [{ data: brands }, { data: stages }, { data: channels }] = await Promise.all([
    supabase.from('brands').select('*').eq('is_active', true),
    supabase.from('sales_stages').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('contact_channels').select('*').eq('is_active', true).order('sort_order'),
  ])

  // locationFilter yoksa tüm aktif müşterileri getir
  let customersQuery = supabase
    .from('customers')
    .select('id, brand_id, current_stage_id, is_won, is_lost, created_at, consultant_id, insurance_kasko_offered, oto_koruma_sold, location_id')
    .eq('is_active', true)
  if (locationFilter) customersQuery = customersQuery.eq('location_id', locationFilter)
  let { data: customers, error: customersError } = await customersQuery

  // Eğer kolon yoksa (migration çalıştırılmamış) fallback sorgu
  if (customersError) {
    console.error('[MainReport] customers error:', customersError.message)
    let fallbackQuery = supabase
      .from('customers')
      .select('id, brand_id, current_stage_id, is_won, is_lost, created_at, consultant_id, location_id')
      .eq('is_active', true)
    if (locationFilter) fallbackQuery = fallbackQuery.eq('location_id', locationFilter)
    const { data: fallbackData } = await fallbackQuery
    customers = (fallbackData ?? []).map((c) => ({ ...c, insurance_kasko_offered: false, oto_koruma_sold: false }))
  }

  let consultantsQuery = supabase.from('user_profiles').select('id, full_name, is_active')
  if (locationFilter) consultantsQuery = consultantsQuery.eq('location_id', locationFilter)
  const { data: consultants } = await consultantsQuery

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
    const myCusts = (customers ?? []).filter((cu) => cu.consultant_id === c.id)
    const custCount = myCusts.length
    const wonCount = myCusts.filter((cu) => cu.is_won).length
    const contactCount = (contactLogs ?? []).filter((l) => l.created_by === c.id).length
    const otoKorumaCount = myCusts.filter((cu) => cu.oto_koruma_sold).length
    const kaskoCount = myCusts.filter((cu) => cu.insurance_kasko_offered).length
    return { ...c, custCount, wonCount, contactCount, otoKorumaCount, kaskoCount }
  }).sort((a, b) => b.custCount - a.custCount)

  return (
    <div className="space-y-6">
      {profile?.role === 'super_admin' && (
        <div className="flex justify-end -mt-4 mb-2">
          <Link href="/reports/bergama" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold border border-emerald-200 rounded-lg px-4 h-9 flex items-center shadow-sm bg-white">
            İncesu Otomotiv →
          </Link>
        </div>
      )}
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Building2 className="h-4 w-4 text-blue-600" />
          <p className="text-sm text-blue-800 font-medium">{mainLocationRow?.name ?? profile?.location?.name ?? 'Enriko Aliberti'} — Rapor Dönemi</p>
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
          <div className="flex items-center gap-3 mb-5">
            <div className="h-8 w-8 rounded-lg bg-[#1E3A5F] flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Danışman Bazlı Performans</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Danışman</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-blue-500 uppercase tracking-wide">
                    <div className="flex items-center justify-end gap-1">
                      <Users className="h-3 w-3" />
                      Satış Adedi
                    </div>
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-emerald-500 uppercase tracking-wide">
                    <div className="flex items-center justify-end gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Kapama Oranı
                    </div>
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-purple-500 uppercase tracking-wide">
                    <div className="flex items-center justify-end gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Temas
                    </div>
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-orange-500 uppercase tracking-wide">
                    <div className="flex items-center justify-end gap-1">
                      <Shield className="h-3 w-3" />
                      Oto Koruma
                    </div>
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-sky-500 uppercase tracking-wide">
                    <div className="flex items-center justify-end gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Kasko Oranı
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {consultantPerf.map((c) => {
                  const closeRate = c.custCount > 0 ? (c.wonCount / c.custCount) * 100 : 0
                  const kaskoRate = c.custCount > 0 ? (c.kaskoCount / c.custCount) * 100 : 0
                  const otoRate = c.custCount > 0 ? (c.otoKorumaCount / c.custCount) * 100 : 0
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#2D5A8E] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                            {c.full_name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">{c.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center justify-center h-6 min-w-[2rem] px-2 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                          {c.custCount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(closeRate, 100)}%`, backgroundColor: closeRate >= 35 ? '#10B981' : closeRate >= 20 ? '#6366F1' : '#F59E0B' }} />
                          </div>
                          <span className={`text-xs font-bold ${closeRate >= 35 ? 'text-emerald-600' : closeRate >= 20 ? 'text-indigo-600' : 'text-amber-600'}`}>
                            {c.custCount > 0 ? `%${closeRate.toFixed(0)}` : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center justify-center h-6 min-w-[2rem] px-2 rounded-md bg-purple-50 text-purple-700 text-xs font-bold">
                          {c.contactCount}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-gray-500">{c.otoKorumaCount}</span>
                          <span className={`text-xs font-bold ${otoRate >= 35 ? 'text-orange-600' : otoRate >= 20 ? 'text-orange-400' : 'text-gray-400'}`}>
                            {c.custCount > 0 ? `(%${otoRate.toFixed(0)})` : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-gray-500">{c.kaskoCount}</span>
                          <span className={`text-xs font-bold ${kaskoRate >= 35 ? 'text-sky-600' : kaskoRate >= 20 ? 'text-sky-400' : 'text-gray-400'}`}>
                            {c.custCount > 0 ? `(%${kaskoRate.toFixed(0)})` : '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {consultantPerf.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-8">Henüz danışman verisi bulunmuyor.</p>
            )}
          </div>
        </div>

        {/* Heatmap + Channel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ContactHeatmap data={heatmapData} />
          <ChannelChart data={channelStats} />
        </div>

        {/* Activity chart */}
        <ActivityChart data={activityData} title="Son 30 Gün Temas Aktivitesi" />
    </div>
  )
}
