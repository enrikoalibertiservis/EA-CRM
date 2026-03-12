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

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {/* Brand header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: data.brand.color + '18' }}>
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: data.brand.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">{data.brand.name}</h3>
            <p className="text-[10px] text-gray-400">Satış Hunisi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
            {data.total} toplam
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            ✓ {data.won}
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            ✗ {data.lost}
          </span>
        </div>
      </div>

      {/* Funnel bars */}
      <div className="space-y-2.5">
        {data.stages.map(({ stage, count }) => {
          const Icon = stageIcons[stage.slug] ?? Car
          const width = count === 0 ? 3 : Math.max((count / maxCount) * 100, 8)
          return (
            <div key={stage.id} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-36 flex-shrink-0">
                <div className="h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: stage.color + '18' }}>
                  <Icon className="h-3 w-3" style={{ color: stage.color }} />
                </div>
                <span className="text-xs font-medium text-gray-600 truncate">{stage.name}</span>
              </div>
              <div className="flex-1 h-7 bg-gray-50 rounded-xl overflow-hidden">
                <div
                  className="h-full rounded-xl flex items-center justify-end pr-2.5 transition-all duration-700 ease-out"
                  style={{
                    width: `${width}%`,
                    background: count > 0
                      ? `linear-gradient(90deg, ${stage.color}15, ${stage.color}35)`
                      : `${stage.color}08`,
                    borderRight: count > 0 ? `3px solid ${stage.color}` : `3px solid ${stage.color}30`,
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: count > 0 ? stage.color : stage.color + '60' }}>
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
