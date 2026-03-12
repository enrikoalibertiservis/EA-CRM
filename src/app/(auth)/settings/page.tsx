import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Ayarlar</h1>
          <p className="text-xs text-gray-500">Sistem ayarları</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.04] p-8 text-center">
        <Settings className="h-10 w-10 mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-gray-600 font-medium">Sistem ayarları yakında eklenecek</p>
        <p className="text-xs text-gray-400 mt-1">Markalar, aşamalar, kanallar ve diğer yapılandırmalar burada yönetilecektir.</p>
      </div>
    </div>
  )
}
