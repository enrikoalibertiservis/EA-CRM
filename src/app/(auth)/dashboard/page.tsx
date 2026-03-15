import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles').select('*, location:locations(*)').eq('id', user!.id).single()

  const [
    { data: brands },
    { data: models },
    { data: locations },
    { data: stages },
    { data: customers },
    { data: contactLogs },
  ] = await Promise.all([
    supabase.from('brands').select('*').eq('is_active', true).order('name'),
    supabase.from('vehicle_models').select('id, brand_id, name').eq('is_active', true).order('sort_order'),
    supabase.from('locations').select('id, name').order('name'),
    supabase.from('sales_stages').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('customers').select('id, brand_id, current_stage_id, is_won, is_lost, created_at, consultant_id, location_id, source_channel_id, brand:brands(id, name, color), source_channel:contact_channels(id, name, slug, icon_name, color)').eq('is_active', true),
    supabase.from('contact_logs').select('id, contact_date'),
  ])

  const firstName  = profile?.full_name?.split(' ')[0] ?? 'Kullanıcı'
  const today      = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const roleLabel  = profile?.role === 'super_admin' ? 'Yönetici Paneli' : profile?.role === 'manager' ? 'Satış Müdürü Paneli' : 'Danışman Paneli'

  return (
    <DashboardClient
      customers={customers ?? []}
      contactLogs={contactLogs ?? []}
      locations={locations ?? []}
      brands={brands ?? []}
      stages={stages ?? []}
      models={models ?? []}
      firstName={firstName}
      today={today}
      roleLabel={roleLabel}
      currentUserId={user!.id}
      currentLocationId={profile?.location_id ?? ''}
    />
  )
}
