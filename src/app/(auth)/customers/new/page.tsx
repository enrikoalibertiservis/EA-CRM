import { createClient } from '@/lib/supabase/server'
import { CustomerForm } from '@/components/customers/customer-form'
import { UserPlus } from 'lucide-react'

export default async function NewCustomerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles').select('id, location_id').eq('id', user!.id).single()

  const [{ data: brands }, { data: channels }, { data: consultants }] = await Promise.all([
    supabase.from('brands').select('id, name, color').eq('is_active', true),
    supabase.from('contact_channels').select('id, name, icon_name, color').eq('is_active', true).order('sort_order'),
    supabase.from('user_profiles').select('id, full_name').eq('is_active', true).eq('location_id', profile?.location_id ?? ''),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
          <UserPlus className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Yeni Müşteri</h1>
          <p className="text-xs text-gray-500">CRM&apos;e yeni müşteri kaydı ekle</p>
        </div>
      </div>
      <CustomerForm
        brands={brands ?? []}
        channels={channels ?? []}
        consultants={consultants ?? []}
        currentUserId={user!.id}
        currentLocationId={profile?.location_id ?? ''}
      />
    </div>
  )
}
