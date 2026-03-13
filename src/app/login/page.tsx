'use client'

import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, Shield, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type Step = 'credentials' | 'totp'

export default function LoginPage() {
  const [step, setStep]           = useState<Step>('credentials')
  const [loading, setLoading]     = useState(false)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [totpCode, setTotpCode]   = useState('')
  const [factorId, setFactorId]   = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // ── Step 1: e-posta + şifre ───────────────────────────────────────────────

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('E-posta ve şifre zorunludur')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error(
          error.message.toLowerCase().includes('invalid')
            ? 'E-posta veya şifre hatalı'
            : error.message,
        )
        return
      }

      // MFA seviyesini kontrol et
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        // TOTP adımına geç
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const totp = factors?.totp?.[0]
        if (!totp) {
          toast.error('Kimlik doğrulayıcı kaydı bulunamadı. Yönetici ile iletişime geçin.')
          await supabase.auth.signOut()
          return
        }
        setFactorId(totp.id)
        setStep('totp')
        setTotpCode('')
      } else {
        // MFA yok / zaten aal2 → direkt dashboard
        window.location.href = '/dashboard'
      }
    } catch {
      toast.error('Giriş yapılırken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: TOTP kodu ─────────────────────────────────────────────────────

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = totpCode.replace(/\s/g, '')
    if (code.length !== 6) {
      toast.error('6 haneli kodu eksiksiz girin')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
      if (cErr) throw cErr

      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      })
      if (vErr) {
        toast.error('Kod hatalı veya süresi dolmuş, tekrar deneyin')
        setTotpCode('')
        return
      }
      window.location.href = '/dashboard'
    } catch {
      toast.error('Doğrulama sırasında hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F2444] via-[#1E3A5F] to-[#0F2444] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* ── Credentials step ── */}
          {step === 'credentials' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Giriş Yap</h2>
              <p className="text-sm text-gray-500 mb-6">Yetkili personel hesabınızla devam edin.</p>

              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="ornek@eamotors.com"
                      autoComplete="email"
                      className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full h-11 pl-9 pr-10 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-[#1E3A5F] text-white font-semibold text-sm hover:bg-[#162d4a] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : null}
                  {loading ? 'Doğrulanıyor...' : 'Devam Et'}
                </button>
              </form>

              <div className="flex items-start gap-2 mt-5 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <Shield className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-500">Hesabınız yoksa sistem yöneticinizle iletişime geçin.</p>
              </div>
            </>
          )}

          {/* ── TOTP step ── */}
          {step === 'totp' && (
            <>
              <div className="flex justify-center mb-5">
                <div className="h-14 w-14 rounded-2xl bg-[#1E3A5F]/10 flex items-center justify-center">
                  <Smartphone className="h-7 w-7 text-[#1E3A5F]" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1 text-center">Kimlik Doğrulama</h2>
              <p className="text-sm text-gray-500 mb-6 text-center">
                Google Authenticator uygulamasındaki <span className="font-medium text-gray-700">6 haneli kodu</span> girin.
              </p>

              <form onSubmit={handleTotp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Doğrulama Kodu</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoFocus
                    className="w-full h-14 rounded-xl border-2 border-gray-300 bg-white text-2xl font-mono text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || totpCode.length < 6}
                  className="w-full h-11 rounded-xl bg-[#1E3A5F] text-white font-semibold text-sm hover:bg-[#162d4a] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : null}
                  {loading ? 'Doğrulanıyor...' : 'Giriş Yap'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setTotpCode('') }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-1"
                >
                  ← Geri dön
                </button>
              </form>

              <div className="flex items-start gap-2 mt-5 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Shield className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-600">Uygulama kodları 30 saniyede bir yenilenir. Kod çalışmıyorsa saatinizi kontrol edin.</p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          EA Motors © {new Date().getFullYear()} • Tüm hakları saklıdır
        </p>
      </div>
    </div>
  )
}
