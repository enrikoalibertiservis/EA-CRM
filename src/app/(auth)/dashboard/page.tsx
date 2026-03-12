import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/topbar'
import { BrandFunnel } from '@/components/charts/brand-funnel'
import { ContactHeatmap } from '@/components/charts/contact-heatmap'
import { ChannelChart } from '@/components/charts/channel-chart'
import { ActivityChart } from '@/components/charts/activity-chart'
import {
  Users, TrendingUp, MessageSquare, CheckCircle,
  Clock, UserPlus, ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { Brand, SalesStage, BrandFunnelData, HeatmapCell, ChannelStats, ContactChannel } from '@/lib/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles').select('*, location:locations(*)').eq('id', user!.id).single()

  const { data: brands } = await supabase.from('brands').select('*').eq('is_active', true).order('name')
  const { data: stages } = await supabase.from('sales_stages').select('*').eq('is_active', true).order('sort_order')
  const { data: customers } = await supabase.from('customers').select('id, brand_id, current_stage_id, is_won, is_lost, created_at, consultant_id, location_id').eq('is_active', true)
  const { data: contactLogs } = await supabase.from('contact_logs').select('id, channel_id, contact_date, created_by')
  const { data: channels } = await supabase.from('contact_channels').select('*').eq('is_active', true).order('sort_order')
  const { data: recentCustomers } = await supabase
    .from('customers')
    .select('id, full_name, phone, created_at, brand:brands(name, color), current_stage:sales_stages(name, color, slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(7)

  // Brand funnel
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

  // Heatmap
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

  // Channel stats
  const channelStats: ChannelStats[] = (channels ?? []).map((ch: ContactChannel) => {
    const count = (contactLogs ?? []).filter((l) => l.channel_id === ch.id).length
    return { channel: ch, count, percentage: 0 }
  }).filter((s: ChannelStats) => s.count > 0)
  const totalContacts = channelStats.reduce((sum: number, s: ChannelStats) => sum + s.count, 0)
  channelStats.forEach((s: ChannelStats) => { s.percentage = totalContacts > 0 ? (s.count / totalContacts) * 100 : 0 })
  channelStats.sort((a: ChannelStats, b: ChannelStats) => b.count - a.count)

  // Activity
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

  const stats = [
    { label: 'Toplam Müşteri', value: totalCustomers, icon: Users, cls: 'stat-card-blue', change: '+12%' },
    { label: 'Aktif Takip', value: activeCustomers, icon: Clock, cls: 'stat-card-teal', change: 'devam ediyor' },
    { label: 'Kazanılan', value: wonCustomers, icon: CheckCircle, cls: 'stat-card-green', change: '+3 bu hafta' },
    { label: 'Toplam Temas', value: totalContactCount, icon: MessageSquare, cls: 'stat-card-purple', change: 'tüm zamanlar' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#F0F2F5' }}>
      <Topbar
        title="Dashboard"
        subtitle={today}
        actions={
          <Link href="/customers/new"
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #1A3A6B, #2D5A9E)' }}>
            <UserPlus className="h-4 w-4" />
            Yeni Müşteri
          </Link>
        }
      />

      <div className="p-6 space-y-5">

        {/* Welcome Banner */}
        <div className="welcome-banner p-6 text-white relative">
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/60 text-sm font-medium mb-1">{today}</p>
              <h2 className="text-2xl font-bold">Hoş Geldiniz, {firstName} 👋</h2>
              <p className="text-white/60 text-sm mt-1">
                {profile?.role === 'super_admin' ? 'Süper Admin Paneli' : profile?.role === 'manager' ? 'Yönetici Paneli' : 'Danışman Paneli'}
                {' · '}{profile?.location?.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white/60 text-xs">Toplam Müşteri</p>
                <p className="text-3xl font-bold">{totalCustomers}</p>
              </div>
              <div className="h-12 w-px bg-white/20" />
              <div className="text-right">
                <p className="text-white/60 text-xs">Kazanılan</p>
                <p className="text-3xl font-bold text-green-300">{wonCustomers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className={`${stat.cls} rounded-2xl p-5 text-white card-hover`}>
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 opacity-50" />
                </div>
                <p className="text-3xl font-bold mt-3">{stat.value}</p>
                <p className="text-white/70 text-sm mt-0.5 font-medium">{stat.label}</p>
                <p className="text-white/50 text-xs mt-1">{stat.change}</p>
              </div>
            )
          })}
        </div>

        {/* Brand Funnels */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Marka Bazlı Satış Hunisi</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {brandFunnelData.map((d) => <BrandFunnel key={d.brand.id} data={d} />)}
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

        {/* Activity + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ActivityChart data={activityData} title="Son 14 Gün — Günlük Temas Aktivitesi" />
          </div>

          {/* Recent Customers */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Son Eklenen Müşteriler</h3>
              <Link href="/customers" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                Tümü →
              </Link>
            </div>
            <div className="space-y-1">
              {(recentCustomers ?? []).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Henüz müşteri yok</p>
              ) : (
                (recentCustomers ?? []).map((c) => {
                  const brand = Array.isArray(c.brand) ? c.brand[0] : c.brand
                  const stage = Array.isArray(c.current_stage) ? c.current_stage[0] : c.current_stage
                  return (
                    <Link key={c.id} href={`/customers/${c.id}`}
                      className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${brand?.color ?? '#6B7280'}, ${brand?.color ?? '#6B7280'}99)` }}>
                        {c.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{c.full_name}</p>
                        <p className="text-[10px] text-gray-400">{brand?.name} · {formatDate(c.created_at)}</p>
                      </div>
                      {stage && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: stage.color + '20', color: stage.color }}>
                          {stage.name}
                        </span>
                      )}
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
