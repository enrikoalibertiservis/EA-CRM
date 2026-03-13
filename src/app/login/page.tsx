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
        <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden ${step === 'totp' ? '' : 'p-8'}`}>

          {/* ── Credentials step ── */}
          {step === 'credentials' && (
            <div className="p-8">
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
            </div>
          )}

          {/* ── TOTP step ── */}
          {step === 'totp' && (
            <div>
              {/* Google Authenticator branded header */}
              <div className="relative mb-6 px-8 pt-8 pb-6 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)' }}>
                {/* decorative circles */}
                <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-20" style={{ background: 'rgba(255,255,255,0.3)' }} />
                <div className="absolute bottom-0 left-1/3 h-20 w-20 rounded-full opacity-10" style={{ background: 'rgba(255,255,255,0.5)' }} />

                <div className="relative z-10 flex flex-col items-center gap-3">
                  {/* Google Authenticator icon (official-style) */}
                  <div className="h-16 w-16 rounded-2xl bg-white shadow-lg flex items-center justify-center"
                    style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                    <svg viewBox="0 0 48 48" className="h-10 w-10">
                      <circle cx="24" cy="24" r="22" fill="#1a73e8" />
                      <circle cx="24" cy="24" r="14" fill="none" stroke="white" strokeWidth="3" />
                      <circle cx="24" cy="24" r="5" fill="white" />
                      {/* tick marks */}
                      {[0,45,90,135,180,225,270,315].map((deg, i) => (
                        <line key={i}
                          x1={24 + 11 * Math.cos((deg - 90) * Math.PI / 180)}
                          y1={24 + 11 * Math.sin((deg - 90) * Math.PI / 180)}
                          x2={24 + 13.5 * Math.cos((deg - 90) * Math.PI / 180)}
                          y2={24 + 13.5 * Math.sin((deg - 90) * Math.PI / 180)}
                          stroke="white" strokeWidth={deg % 90 === 0 ? 2.5 : 1.5} />
                      ))}
                    </svg>
                  </div>
                  <div className="text-center">
                    <h2 className="text-lg font-bold text-white">İki Faktörlü Doğrulama</h2>
                    <p className="text-blue-100 text-xs mt-0.5">Google Authenticator</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-5 text-center px-8">
                Uygulamadaki <span className="font-semibold text-gray-800">6 haneli kodu</span> girin.
                <br />
                <span className="text-xs text-gray-400">Kod 30 saniyede bir yenilenir.</span>
              </p>

              <form onSubmit={handleTotp} className="space-y-4 px-8 pb-2">
                <div>
                  {/* Digit boxes + transparent real input overlaid on top */}
                  <div className="relative flex gap-2 justify-center">
                    {[0,1,2,3,4,5].map(i => (
                      <div key={i}
                        className="h-12 w-10 rounded-xl flex items-center justify-center text-xl font-mono font-bold border-2 transition-all pointer-events-none select-none"
                        style={{
                          borderColor: totpCode[i]
                            ? '#1a73e8'
                            : i === totpCode.length ? '#1a73e8' : '#E5E7EB',
                          background: totpCode[i] ? '#EFF6FF' : '#F9FAFB',
                          color: '#1a73e8',
                          boxShadow: i === totpCode.length ? '0 0 0 3px #1a73e820' : 'none',
                        }}>
                        {totpCode[i] ?? ''}
                      </div>
                    ))}
                    {/* Transparent input overlaid — full size, tappable on mobile */}
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={totpCode}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                        setTotpCode(val)
                        if (val.length === 6) {
                          setTimeout(() => {
                            const form = e.target.closest('form')
                            form?.requestSubmit()
                          }, 80)
                        }
                      }}
                      autoFocus
                      aria-label="Doğrulama kodu"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10 caret-transparent"
                    />
                  </div>
                  <p className="text-center text-[11px] text-blue-400 mt-2">Kutulara dokunarak klavyeyi açın</p>
                </div>

                <button
                  type="submit"
                  disabled={loading || totpCode.length < 6}
                  className="w-full h-11 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)' }}
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

              <div className="flex items-start gap-2 mx-8 mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Shield className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-600">Uygulama kodları 30 saniyede bir yenilenir. Kod çalışmıyorsa saatinizi kontrol edin.</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          EA Motors © {new Date().getFullYear()} • Tüm hakları saklıdır
        </p>
      </div>
    </div>
  )
}
