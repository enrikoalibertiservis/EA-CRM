import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/topbar'
import { CustomerForm } from '@/components/customers/customer-form'

export default async function NewCustomerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, location_id')
    .eq('id', user!.id)
    .single()

  const [{ data: brands }, { data: channels }, { data: consultants }] = await Promise.all([
    supabase.from('brands').select('id, name, color').eq('is_active', true),
    supabase.from('contact_channels').select('id, name, icon_name, color').eq('is_active', true).order('sort_order'),
    supabase.from('user_profiles').select('id, full_name').eq('is_active', true).eq('location_id', profile?.location_id ?? ''),
  ])

  return (
    <div>
      <Topbar title="Yeni Müşteri" subtitle="CRM'e yeni müşteri kaydı ekle" />
      <div className="p-6">
        <CustomerForm
          brands={brands ?? []}
          channels={channels ?? []}
          consultants={consultants ?? []}
          currentUserId={user!.id}
          currentLocationId={profile?.location_id ?? ''}
        />
      </div>
    </div>
  )
}
