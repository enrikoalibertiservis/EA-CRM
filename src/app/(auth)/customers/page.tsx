import { createClient } from '@/lib/supabase/server'
import { CustomerList } from '@/components/customers/customer-list'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import type { Customer } from '@/lib/types/database'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: customers },
    { data: brands },
    { data: stages },
    { data: consultants },
    { data: profile },
    { data: locations },
    { data: channels },
    { data: contactTypes },
  ] = await Promise.all([
    supabase
      .from('customers')
      .select(`*, brand:brands(id, name, color, slug), source_channel:contact_channels(id, name, icon_name, color), consultant:user_profiles(id, full_name), current_stage:sales_stages(id, name, color, slug, sort_order), location:locations(id, name)`)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase.from('brands').select('id, name, color, slug').eq('is_active', true),
    supabase.from('sales_stages').select('id, name, color, slug, sort_order').eq('is_active', true).order('sort_order'),
    supabase.from('user_profiles').select('id, full_name').eq('is_active', true),
    supabase.from('user_profiles').select('role').eq('id', user!.id).single(),
    supabase.from('locations').select('id, name').order('name'),
    supabase.from('contact_channels').select('id, name, color').eq('is_active', true).order('sort_order'),
    supabase.from('contact_types').select('id, name, slug, color').order('sort_order'),
  ])

  return (
    <div className="space-y-4">
      <CustomerList
        customers={(customers ?? []) as Customer[]}
        brands={brands ?? []}
        stages={stages ?? []}
        consultants={consultants ?? []}
        locations={locations ?? []}
        channels={channels ?? []}
        contactTypes={contactTypes ?? []}
        userRole={profile?.role ?? 'consultant'}
      />
    </div>
  )
}
