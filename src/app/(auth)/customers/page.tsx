import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/topbar'
import { CustomerList } from '@/components/customers/customer-list'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
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
      .select(`
        *,
        brand:brands(id, name, color, slug),
        source_channel:contact_channels(id, name, icon_name, color),
        consultant:user_profiles(id, full_name),
        current_stage:sales_stages(id, name, color, slug, sort_order)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase.from('brands').select('id, name, color, slug').eq('is_active', true),
    supabase.from('sales_stages').select('id, name, color, slug, sort_order').eq('is_active', true).order('sort_order'),
    supabase.from('user_profiles').select('id, full_name').eq('is_active', true),
  ])

  return (
    <div>
      <Topbar
        title="Müşteriler"
        subtitle={`${customers?.length ?? 0} kayıt`}
        actions={
          <Link
            href="/customers/new"
            className="flex items-center gap-1.5 h-8 px-3 bg-[#1E3A5F] text-white text-xs font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Yeni Müşteri
          </Link>
        }
      />
      <div className="p-6">
        <CustomerList
          customers={(customers ?? []) as Customer[]}
          brands={brands ?? []}
          stages={stages ?? []}
          consultants={consultants ?? []}
        />
      </div>
    </div>
  )
}
