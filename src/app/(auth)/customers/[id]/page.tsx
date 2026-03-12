import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { CustomerDetail } from '@/components/customers/customer-detail'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
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
    supabase
      .from('customers')
      .select(`
        *,
        brand:brands(*),
        source_channel:contact_channels(*),
        consultant:user_profiles(id, full_name),
        location:locations(*),
        current_stage:sales_stages(*)
      `)
      .eq('id', id)
      .single(),
    supabase.from('sales_stages').select('*').eq('is_active', true).order('sort_order'),
    supabase
      .from('customer_stage_history')
      .select(`
        *,
        stage:sales_stages(*),
        entered_by_profile:user_profiles(id, full_name)
      `)
      .eq('customer_id', id)
      .order('entered_at', { ascending: false }),
    supabase
      .from('contact_logs')
      .select(`
        *,
        channel:contact_channels(*),
        created_by_profile:user_profiles(id, full_name)
      `)
      .eq('customer_id', id)
      .order('contact_date', { ascending: false }),
    supabase
      .from('vehicle_interests')
      .select('*, brand:brands(*)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('contact_channels').select('*').eq('is_active', true).order('sort_order'),
  ])

  if (!customer) notFound()

  return (
    <div>
      <Topbar
        title={customer.full_name}
        subtitle={`${customer.brand?.name ?? ''} • ${customer.location?.name ?? ''}`}
        actions={
          <Link
            href="/customers"
            className="flex items-center gap-1 h-8 px-3 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Geri
          </Link>
        }
      />
      <div className="p-6">
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
    </div>
  )
}
