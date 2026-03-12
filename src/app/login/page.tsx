'use client'

import { useState } from 'react'
import { Car, Shield } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error
    } catch {
      toast.error('Giriş yapılırken hata oluştu. Lütfen tekrar deneyin.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F2444] via-[#1E3A5F] to-[#0F2444] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center">
              <Car className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">EA Motors CRM</h1>
          <p className="text-white/50 text-sm">Yetkili Bayi Satış Yönetimi</p>

          {/* Brand logos row */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[
              { name: 'Fiat', color: '#CC0000' },
              { name: 'Alfa Romeo', color: '#8B0000' },
              { name: 'Jeep', color: '#2D5016' },
              { name: 'İkinci El', color: '#4A5568' },
            ].map((brand) => (
              <span
                key={brand.name}
                className="text-[10px] font-semibold px-2 py-0.5 rounded"
                style={{ backgroundColor: brand.color + '33', color: brand.color === '#4A5568' ? '#9CA3AF' : brand.color, border: `1px solid ${brand.color}44` }}
              >
                {brand.name}
              </span>
            ))}
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Giriş Yap</h2>
          <p className="text-sm text-gray-500 mb-6">
            Sistemin güvenliği için Google ile giriş zorunludur.
          </p>

          {/* Security note */}
          <div className="flex items-start gap-2.5 p-3 bg-blue-50 rounded-lg border border-blue-100 mb-6">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Yetkili personel hesabınızla giriş yapınız. Sisteme erişim için şirket e-posta adresinizi kullanın.
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {loading ? 'Giriş yapılıyor...' : 'Google ile Giriş Yap'}
          </button>

          <p className="text-xs text-center text-gray-400 mt-4">
            Giriş yaparak sistemin kullanım koşullarını kabul etmiş olursunuz.
          </p>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          EA Motors © {new Date().getFullYear()} • Tüm hakları saklıdır
        </p>
      </div>
    </div>
  )
}
