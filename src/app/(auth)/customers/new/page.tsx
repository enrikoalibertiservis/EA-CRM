import { createClient } from '@/lib/supabase/server'
import { CustomerForm } from '@/components/customers/customer-form'

export default async function NewCustomerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles').select('id, role, location_id').eq('id', user!.id).single()

  const [{ data: brands }, { data: models }, { data: channels }, { data: consultants }, { data: contactTypes }, { data: locations }] = await Promise.all([
    supabase.from('brands').select('id, name, color').eq('is_active', true),
    supabase.from('vehicle_models').select('id, brand_id, name').eq('is_active', true).order('sort_order'),
    supabase.from('contact_channels').select('id, name, icon_name, color').eq('is_active', true).order('sort_order'),
    supabase.from('user_profiles').select('id, full_name').eq('is_active', true).eq('location_id', profile?.location_id ?? ''),
    supabase.from('contact_types').select('id, name, slug, icon_name, color').eq('is_active', true).order('sort_order'),
    supabase.from('locations').select('id, name').eq('is_active', true).order('sort_order'),
  ])

  return (
    <div className="space-y-4">
      <CustomerForm
        brands={brands ?? []}
        models={models ?? []}
        channels={channels ?? []}
        consultants={consultants ?? []}
        contactTypes={contactTypes ?? []}
        locations={locations ?? []}
        currentUserId={user!.id}
        currentLocationId={profile?.location_id ?? ''}
      />
    </div>
  )
}
