import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CustomerDetail } from '@/components/customers/customer-detail'
import type { Customer, CustomerStageHistory, ContactLog, VehicleInterest } from '@/lib/types/database'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: customer },
    { data: stages },
    { data: history },
    { data: contactLogs },
    { data: vehicleInterests },
    { data: channels },
  ] = await Promise.all([
    supabase.from('customers').select(`*, brand:brands(*), source_channel:contact_channels(*), consultant:user_profiles(id, full_name), location:locations(*), current_stage:sales_stages(*)`).eq('id', id).single(),
    supabase.from('sales_stages').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('customer_stage_history').select(`*, stage:sales_stages(*), entered_by_profile:user_profiles(id, full_name)`).eq('customer_id', id).order('entered_at', { ascending: false }),
    supabase.from('contact_logs').select(`*, channel:contact_channels(*), created_by_profile:user_profiles(id, full_name)`).eq('customer_id', id).order('contact_date', { ascending: false }),
    supabase.from('vehicle_interests').select('*, brand:brands(*)').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('contact_channels').select('*').eq('is_active', true).order('sort_order'),
  ])

  if (!customer) notFound()

  return (
    <div className="space-y-4">
      {/* Customer name sub-header (under PageHero) */}
      <div className="flex items-center gap-3 -mt-2 mb-1">
        <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
          style={{ backgroundColor: customer.brand?.color ?? '#6B7280' }}>
          {customer.full_name.charAt(0)}
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{customer.full_name}</h1>
          <p className="text-xs text-gray-500">{customer.brand?.name ?? ''} · {customer.location?.name ?? ''}</p>
        </div>
      </div>
      <CustomerDetail
        customer={customer as Customer}
        stages={stages ?? []}
        history={(history ?? []) as CustomerStageHistory[]}
        contactLogs={(contactLogs ?? []) as ContactLog[]}
        vehicleInterests={(vehicleInterests ?? []) as VehicleInterest[]}
        channels={channels ?? []}
        currentUserId={user!.id}
      />
    </div>
  )
}
