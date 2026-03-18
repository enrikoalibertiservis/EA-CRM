'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle,
  ArrowLeft, Download, Loader2, X, Info,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────
interface PreviewRow { [key: string]: string }
interface ImportResult {
  savedCount: number
  skipped: { row: number; reason: string }[]
  errors:  { row: number; reason: string }[]
}

// ─── Template download ────────────────────────────────────────────────────────
function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Ad Soyad', 'Telefon', 'Marka', 'Danışman', 'Lokasyon', 'Kayıt Tarihi', 'İlgilendiği Model', 'Nereden Ulaştı?', 'Aşama', 'Durum', 'İl', 'İlçe', 'Not'],
    ['Ahmet Yılmaz', '05321234567', 'Fiat', 'Danışman Adı', 'Enriko Aliberti', '01.03.2026', 'Egea', 'Instagram', 'Teklif', '', 'İzmir', 'Bergama', ''],
  ])
  ws['!cols'] = Array(13).fill({ wch: 18 })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler')
  XLSX.writeFile(wb, 'musteri_import_sablonu.xlsx')
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ImportPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName]   = useState('')
  const [preview, setPreview]     = useState<PreviewRow[]>([])
  const [headers, setHeaders]     = useState<string[]>([])
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<ImportResult | null>(null)

  const parseFile = useCallback((file: File) => {
    if (!file) return
    setFileName(file.name)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const wb   = XLSX.read(data, { type: 'array', cellDates: true })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const rows: PreviewRow[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (!rows.length) { toast.error('Dosya boş görünüyor'); return }
      setHeaders(Object.keys(rows[0]))
      setPreview(rows as PreviewRow[])
      toast.success(`${rows.length} satır okundu`)
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  const handleImport = async () => {
    if (!preview.length) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/import-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: preview }),
      })
      const data: ImportResult = await res.json()
      if (!res.ok) throw new Error((data as unknown as { error: string }).error)
      setResult(data)
      if (data.savedCount > 0) toast.success(`${data.savedCount} müşteri başarıyla aktarıldı`)
      else toast.warning('Hiçbir kayıt aktarılamadı')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Import başarısız')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFileName(''); setPreview([]); setHeaders([]); setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/customers" className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm">
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Excel / CSV İçe Aktar</h1>
          <p className="text-sm text-slate-500 mt-0.5">Müşteri kayıtlarını toplu olarak sisteme aktarın</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="ml-auto flex items-center gap-2 h-9 px-4 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 text-sm font-medium hover:bg-emerald-100 transition-colors"
        >
          <Download className="h-4 w-4" />
          Şablon İndir
        </button>
      </div>

      {/* Info box */}
      <div className="flex gap-3 p-4 rounded-2xl bg-blue-50/80 border border-blue-100">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Zorunlu sütunlar: Ad Soyad, Telefon, Marka, Lokasyon</p>
          <p className="text-blue-600">Marka, Danışman, Lokasyon, Aşama ve Nereden Ulaştı değerleri sistemdeki kayıtlarla birebir eşleşmeli. "Şablon İndir" ile örnek dosyayı görebilirsiniz.</p>
        </div>
      </div>

      {/* Drop zone */}
      {!preview.length ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-16 cursor-pointer transition-all ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
            <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-700">Excel veya CSV dosyasını buraya sürükleyin</p>
            <p className="text-sm text-slate-400 mt-1">ya da tıklayarak seçin — .xlsx, .xls, .csv desteklenir</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <>
          {/* File info bar */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-sm">
            <FileSpreadsheet className="h-5 w-5 text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{fileName}</p>
              <p className="text-xs text-slate-400">{preview.length} satır • {headers.length} sütun okundu</p>
            </div>
            <button onClick={reset} className="h-7 w-7 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
              <X className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>

          {/* Preview table */}
          {!result && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Önizleme (ilk 10 satır)</span>
                <span className="text-xs text-slate-400">Toplam: {preview.length} kayıt</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {headers.map(h => (
                        <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                        {headers.map(h => (
                          <td key={h} className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[180px] truncate">
                            {row[h] !== undefined && row[h] !== '' ? String(row[h]) : <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 10 && (
                <div className="px-5 py-2 text-xs text-slate-400 border-t border-slate-100 bg-slate-50/40">
                  + {preview.length - 10} satır daha gösterilmiyor
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {/* Success */}
              <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-green-50 border border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">{result.savedCount} müşteri başarıyla aktarıldı</p>
                  {(result.skipped.length + result.errors.length) > 0 && (
                    <p className="text-sm text-green-700 mt-0.5">{result.skipped.length + result.errors.length} satır atlandı veya hata aldı</p>
                  )}
                </div>
                <button
                  onClick={() => router.push('/customers')}
                  className="ml-auto h-8 px-4 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors"
                >
                  Listeye Git
                </button>
              </div>

              {/* Skipped */}
              {result.skipped.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-100">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-sm font-semibold text-amber-800">Atlanan Satırlar ({result.skipped.length})</span>
                  </div>
                  <div className="divide-y divide-amber-100 max-h-48 overflow-y-auto">
                    {result.skipped.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-2 text-xs">
                        <span className="font-mono text-amber-500 shrink-0">Satır {s.row}</span>
                        <span className="text-amber-700">{s.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-red-100">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span className="text-sm font-semibold text-red-800">Hatalı Satırlar ({result.errors.length})</span>
                  </div>
                  <div className="divide-y divide-red-100 max-h-48 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-2 text-xs">
                        <span className="font-mono text-red-500 shrink-0">Satır {e.row}</span>
                        <span className="text-red-700">{e.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          {!result && (
            <div className="flex items-center justify-end gap-3">
              <button onClick={reset} className="h-10 px-5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                İptal
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="h-10 px-6 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Aktarılıyor...</>
                ) : (
                  <><Upload className="h-4 w-4" /> {preview.length} Kaydı Aktar</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
