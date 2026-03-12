import { createClient } from '@/lib/supabase/server'
import { CustomerList } from '@/components/customers/customer-list'
import Link from 'next/link'
import { UserPlus, Users } from 'lucide-react'
import type { Customer } from '@/lib/types/database'

export default async function CustomersPage() {
  const supabase = await createClient()

  const [
    { data: customers },
    { data: brands },
    { data: stages },
    { data: consultants },
  ] = await Promise.all([
    supabase
      .from('customers')
      .select(`*, brand:brands(id, name, color, slug), source_channel:contact_channels(id, name, icon_name, color), consultant:user_profiles(id, full_name), current_stage:sales_stages(id, name, color, slug, sort_order)`)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase.from('brands').select('id, name, color, slug').eq('is_active', true),
    supabase.from('sales_stages').select('id, name, color, slug, sort_order').eq('is_active', true).order('sort_order'),
    supabase.from('user_profiles').select('id, full_name').eq('is_active', true),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Müşteriler</h1>
            <p className="text-xs text-gray-500">{customers?.length ?? 0} kayıt</p>
          </div>
        </div>
        <Link href="/customers/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white text-sm shadow-sm hover:bg-blue-700 transition-colors">
          <UserPlus className="h-4 w-4" />
          Yeni Müşteri
        </Link>
      </div>
      <CustomerList
        customers={(customers ?? []) as Customer[]}
        brands={brands ?? []}
        stages={stages ?? []}
        consultants={consultants ?? []}
      />
    </div>
  )
}
