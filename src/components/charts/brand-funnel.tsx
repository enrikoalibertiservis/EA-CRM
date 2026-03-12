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

interface BrandFunnelProps {
  data: BrandFunnelData
}

export function BrandFunnel({ data }: BrandFunnelProps) {
  const maxCount = Math.max(...data.stages.map((s) => s.count), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      {/* Brand header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: data.brand.color }}
          />
          <h3 className="text-sm font-semibold text-gray-900">{data.brand.name}</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">Toplam: <span className="font-semibold text-gray-900">{data.total}</span></span>
          <span className="text-green-600 font-medium">✓ {data.won}</span>
          <span className="text-red-500 font-medium">✗ {data.lost}</span>
        </div>
      </div>

      {/* Funnel bars */}
      <div className="space-y-2">
        {data.stages.map(({ stage, count }) => {
          const Icon = stageIcons[stage.slug] ?? Car
          const width = count === 0 ? 0 : Math.max((count / maxCount) * 100, 8)
          return (
            <div key={stage.id} className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 w-32 flex-shrink-0">
                <Icon className="h-3 w-3 flex-shrink-0" style={{ color: stage.color }} />
                <span className="text-xs text-gray-600 truncate">{stage.name}</span>
              </div>
              <div className="flex-1 h-6 bg-gray-50 rounded-md overflow-hidden border border-gray-100">
                <div
                  className="h-full rounded-md flex items-center justify-end pr-2 transition-all duration-500"
                  style={{
                    width: `${width}%`,
                    backgroundColor: stage.color + '22',
                    borderRight: `3px solid ${stage.color}`,
                  }}
                >
                  {count > 0 && (
                    <span className="text-xs font-semibold" style={{ color: stage.color }}>
                      {count}
                    </span>
                  )}
                </div>
              </div>
              {count === 0 && (
                <span className="text-xs text-gray-300 w-4">0</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
