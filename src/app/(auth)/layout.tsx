import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LayoutShell } from '@/components/layout/layout-shell'
import type { UserProfile } from '@/lib/types/database'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, location:locations(*)')
    .eq('id', user.id)
    .single()

  return (
    <LayoutShell profile={profile as UserProfile | null}>
      {children}
    </LayoutShell>
  )
}
