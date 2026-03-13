'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Smartphone, ShieldCheck, ShieldOff, Copy, CheckCheck, AlertTriangle } from 'lucide-react'

type Status = 'loading' | 'not_enrolled' | 'enrolled'

export default function SecurityPage() {
  const [status, setStatus]         = useState<Status>('loading')
  const [enrolledId, setEnrolledId] = useState<string | null>(null)

  // Enroll flow
  const [enrolling, setEnrolling]   = useState(false)
  const [qrSvg, setQrSvg]           = useState('')
  const [secret, setSecret]         = useState('')
  const [newFactorId, setNewFactorId] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying]   = useState(false)
  const [copied, setCopied]         = useState(false)

  // Remove flow
  const [removing, setRemoving]     = useState(false)
  const [confirmCode, setConfirmCode] = useState('')
  const [showRemove, setShowRemove] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.auth.mfa.listFactors()
    const totp = data?.totp?.[0]
    if (totp) {
      setEnrolledId(totp.id)
      setStatus('enrolled')
    } else {
      setStatus('not_enrolled')
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Enroll ────────────────────────────────────────────────────────────────

  const startEnroll = async () => {
    setEnrolling(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Google Authenticator',
      })
      if (error) throw error
      setQrSvg(data.totp.qr_code)
      setSecret(data.totp.secret)
      setNewFactorId(data.id)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Kayıt başlatılamadı')
      setEnrolling(false)
    }
  }

  const verifyEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = verifyCode.replace(/\D/g, '')
    if (code.length !== 6) { toast.error('6 haneli kodu girin'); return }
    setVerifying(true)
    try {
      const supabase = createClient()
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: newFactorId })
      if (cErr) throw cErr
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: newFactorId, challengeId: ch.id, code })
      if (vErr) { toast.error('Kod hatalı, tekrar deneyin'); setVerifyCode(''); return }
      toast.success('Google Authenticator başarıyla etkinleştirildi!')
      setEnrolling(false)
      setQrSvg('')
      setSecret('')
      setNewFactorId('')
      setVerifyCode('')
      await load()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Doğrulama hatası')
    } finally {
      setVerifying(false)
    }
  }

  const cancelEnroll = async () => {
    if (newFactorId) {
      const supabase = createClient()
      await supabase.auth.mfa.unenroll({ factorId: newFactorId })
    }
    setEnrolling(false)
    setQrSvg('')
    setSecret('')
    setNewFactorId('')
    setVerifyCode('')
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  const handleRemove = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrolledId) return
    const code = confirmCode.replace(/\D/g, '')
    if (code.length !== 6) { toast.error('6 haneli kodu girin'); return }
    setRemoving(true)
    try {
      const supabase = createClient()
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrolledId })
      if (cErr) throw cErr
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: enrolledId, challengeId: ch.id, code })
      if (vErr) { toast.error('Kod hatalı, işlem iptal edildi'); setConfirmCode(''); return }
      const { error: uErr } = await supabase.auth.mfa.unenroll({ factorId: enrolledId })
      if (uErr) throw uErr
      toast.success('İki faktörlü doğrulama kaldırıldı')
      setShowRemove(false)
      setConfirmCode('')
      await load()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Kaldırma işlemi başarısız')
    } finally {
      setRemoving(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">

      {/* ── Durum kartı ── */}
      <div className={`rounded-2xl border p-5 flex items-start gap-4 ${
        status === 'enrolled'
          ? 'bg-green-50/60 border-green-200'
          : 'bg-amber-50/60 border-amber-200'
      }`}>
        {status === 'enrolled'
          ? <ShieldCheck className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
          : <ShieldOff className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
        }
        <div>
          <p className={`font-semibold text-sm ${status === 'enrolled' ? 'text-green-800' : 'text-amber-800'}`}>
            {status === 'enrolled' ? 'İki Faktörlü Doğrulama Aktif' : 'İki Faktörlü Doğrulama Kurulu Değil'}
          </p>
          <p className={`text-xs mt-0.5 ${status === 'enrolled' ? 'text-green-700' : 'text-amber-700'}`}>
            {status === 'enrolled'
              ? 'Hesabınız Google Authenticator ile korunuyor. Giriş sırasında 6 haneli kod istenecek.'
              : 'Hesabınızı korumak için Google Authenticator uygulamasını etkinleştirin.'
            }
          </p>
        </div>
      </div>

      {/* ── Not enrolled: başlat / kurulum ── */}
      {status === 'not_enrolled' && !enrolling && (
        <button
          onClick={startEnroll}
          className="w-full h-11 rounded-xl bg-[#1E3A5F] text-white font-semibold text-sm hover:bg-[#162d4a] transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <Smartphone className="h-4 w-4" />
          Google Authenticator Kur
        </button>
      )}

      {/* ── Enroll flow ── */}
      {enrolling && qrSvg && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">1. Uygulamayı Açın</h3>
            <p className="text-sm text-gray-500">Google Authenticator → <strong>+</strong> → <strong>QR kodu tara</strong></p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-3 bg-white rounded-xl border-2 border-gray-100 shadow-sm"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>

          {/* Manuel giriş */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-2">QR kod taranamıyorsa manuel girin:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-gray-800 break-all">{secret}</code>
              <button
                onClick={copySecret}
                className="shrink-0 h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-gray-500" />}
              </button>
            </div>
          </div>

          {/* Doğrulama */}
          <form onSubmit={verifyEnroll} className="space-y-3">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Kodu Doğrulayın</h3>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
                className="w-full h-12 rounded-xl border-2 border-gray-300 bg-white text-xl font-mono text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEnroll}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={verifying || verifyCode.length < 6}
                className="flex-1 h-10 rounded-xl bg-[#1E3A5F] text-white font-semibold text-sm hover:bg-[#162d4a] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {verifying && (
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {verifying ? 'Doğrulanıyor...' : 'Etkinleştir'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Enrolled: kaldır ── */}
      {status === 'enrolled' && (
        <div className="rounded-2xl border border-red-100 bg-red-50/40 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">İki Faktörlü Doğrulamayı Kaldır</p>
              <p className="text-xs text-red-600 mt-0.5">Bu işlem sonrası giriş yaparken kod istenmeyecek. Güvenlik seviyesi düşer.</p>
            </div>
          </div>

          {!showRemove && (
            <button
              onClick={() => setShowRemove(true)}
              className="w-full h-10 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Kaldır
            </button>
          )}

          {showRemove && (
            <form onSubmit={handleRemove} className="space-y-3">
              <p className="text-xs text-red-700">Onaylamak için uygulamadaki mevcut kodu girin:</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={confirmCode}
                onChange={e => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
                className="w-full h-12 rounded-xl border-2 border-red-200 bg-white text-xl font-mono text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowRemove(false); setConfirmCode('') }}
                  className="flex-1 h-10 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={removing || confirmCode.length < 6}
                  className="flex-1 h-10 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {removing && (
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {removing ? 'Kaldırılıyor...' : 'Onayla ve Kaldır'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
