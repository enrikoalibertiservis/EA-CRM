import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
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
    <div className="min-h-screen flex" style={{ background: '#F0F2F5' }}>
      <Sidebar profile={profile as UserProfile | null} />
      <main className="flex-1 ml-[220px] min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
