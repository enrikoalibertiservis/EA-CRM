import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Verify caller is super_admin
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({}, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') return NextResponse.json({}, { status: 403 })

    // Admin client to list all users with factors
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    if (error) throw error

    const result: Record<string, boolean> = {}
    for (const u of data.users) {
      const verified = (u.factors ?? []).filter(
        (f: { status: string }) => f.status === 'verified',
      )
      result[u.id] = verified.length > 0
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
