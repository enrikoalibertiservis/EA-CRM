import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CustomerDetail } from '@/components/customers/customer-detail'

export const dynamic = 'force-dynamic'
import type { Customer, CustomerStageHistory, ContactLog } from '@/lib/types/database'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles').select('role, location_id').eq('id', user!.id).single()

  const [
    { data: customer },
    { data: stages },
    { data: history },
    { data: contactLogs },
    { data: channels },
    { data: brands },
    { data: consultants },
  ] = await Promise.all([
    supabase.from('customers').select(`*, brand:brands(*), source_channel:contact_channels(*), consultant:user_profiles(id, full_name), location:locations(*), current_stage:sales_stages(*)`).eq('id', id).single(),
    supabase.from('sales_stages').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('customer_stage_history').select(`*, stage:sales_stages(*), entered_by_profile:user_profiles(id, full_name)`).eq('customer_id', id).order('entered_at', { ascending: false }),
    supabase.from('contact_logs').select(`*, channel:contact_channels(*), created_by_profile:user_profiles(id, full_name)`).eq('customer_id', id).order('contact_date', { ascending: false }),
    supabase.from('contact_channels').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('brands').select('id, name, color').eq('is_active', true),
    supabase.from('user_profiles').select('id, full_name').eq('is_active', true),
  ])

  if (!customer) notFound()

  const isAdmin = ['super_admin', 'manager'].includes(profile?.role ?? '')

  return (
    <div className="space-y-4">
      <CustomerDetail
        customer={customer as Customer}
        stages={stages ?? []}
        history={(history ?? []) as CustomerStageHistory[]}
        contactLogs={(contactLogs ?? []) as ContactLog[]}
        channels={channels ?? []}
        currentUserId={user!.id}
        isAdmin={isAdmin}
        brandOptions={brands ?? []}
        consultantOptions={consultants ?? []}
      />
    </div>
  )
}
