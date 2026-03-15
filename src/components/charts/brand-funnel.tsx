'use client'

import { type BrandFunnelData } from '@/lib/types/database'
import { Car, FileText, Clock, CheckCircle, Shield, Lock } from 'lucide-react'

const stageIcons: Record<string, React.ElementType> = {
  'arac-tanitimi': Car,
  'teklif': FileText,
  'dusunme': Clock,
  'kabul': CheckCircle,
  'sigorta': Shield,
  'oto-koruma': Lock,
}

export function BrandFunnel({ data }: { data: BrandFunnelData }) {
  const maxCount = Math.max(...data.stages.map((s) => s.count), 1)
  const brandColor = data.brand.color ?? '#6366f1'

  return (
    <div
      className="rounded-2xl p-5 h-full bg-white shadow-sm"
      style={{ border: `1px solid ${brandColor}22` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">{data.brand.name}</h3>
            <p className="text-[10px] text-gray-500">Satış Hunisi</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-600 bg-white/80 px-2 py-0.5 rounded-full shadow-sm">{data.total} toplam</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">✓ {data.won}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">✗ {data.lost}</span>
        </div>
      </div>

      <div className="space-y-2">
        {data.stages.map(({ stage, count }) => {
          const Icon = stageIcons[stage.slug] ?? Car
          const width = count === 0 ? 3 : Math.max((count / maxCount) * 100, 8)
          return (
            <div key={stage.id} className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 w-28 shrink-0">
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: stage.color }} />
                <span className="text-xs text-gray-600 truncate">{stage.name}</span>
              </div>
              <div className="flex-1 h-6 bg-white/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end pr-2.5 transition-all duration-700"
                  style={{
                    width: `${width}%`,
                    background: count > 0
                      ? `linear-gradient(90deg, ${stage.color}30, ${stage.color}60)`
                      : `${stage.color}10`,
                  }}
                >
                  <span className="text-[11px] font-bold" style={{ color: count > 0 ? stage.color : '#9CA3AF' }}>
                    {count}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
