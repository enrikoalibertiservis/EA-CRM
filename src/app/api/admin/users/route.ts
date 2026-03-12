import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') throw new Error('Forbidden')
  return user.id
}

export async function POST(req: NextRequest) {
  try {
    await assertSuperAdmin()
    const body = await req.json()
    const { email, password, full_name, phone, role, location_id, department } = body

    if (!email || !password || !full_name || !role || !location_id) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
    }

    const admin = getServiceClient()

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { error: profileError } = await admin.from('user_profiles').insert({
      id: authUser.user.id,
      full_name,
      phone: phone || null,
      role,
      location_id,
      department: department || null,
      is_active: true,
    })

    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: 'Profil oluşturulamadı: ' + profileError.message }, { status: 500 })
    }

    return NextResponse.json({ user: { id: authUser.user.id, email: authUser.user.email } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Bir hata oluştu'
    const status = msg === 'Unauthorized' ? 401 : msg === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await assertSuperAdmin()
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId gerekli' }, { status: 400 })

    const admin = getServiceClient()
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Bir hata oluştu'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await assertSuperAdmin()
    const body = await req.json()
    const { userId, password } = body

    if (!userId || !password) {
      return NextResponse.json({ error: 'userId ve password gerekli' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 })
    }

    const admin = getServiceClient()
    const { error } = await admin.auth.admin.updateUserById(userId, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Bir hata oluştu'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
