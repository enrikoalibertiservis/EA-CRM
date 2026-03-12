'use client'

import Image from 'next/image'
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

const brandGradients: Record<string, string> = {
  Fiat: 'from-red-50/60 to-orange-50/40 border-red-100',
  'Alfa Romeo': 'from-rose-50/60 to-red-50/40 border-rose-100',
  Jeep: 'from-green-50/60 to-emerald-50/40 border-green-100',
  'İkinci El': 'from-gray-50/60 to-slate-50/40 border-gray-200',
}

const brandLogos: Record<string, string> = {
  'Fiat': '/brands/fiat.png',
  'Alfa Romeo': '/brands/alfa-romeo.png',
  'Jeep': '/brands/jeep.png',
}

export function BrandFunnel({ data }: { data: BrandFunnelData }) {
  const maxCount = Math.max(...data.stages.map((s) => s.count), 1)
  const gradient = brandGradients[data.brand.name] ?? 'from-blue-50/60 to-indigo-50/40 border-blue-100'
  const logo = brandLogos[data.brand.name]

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${gradient} p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {logo ? (
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <Image
                src={logo}
                alt={data.brand.name}
                width={40}
                height={40}
                className="object-contain w-10 h-10"
                style={{ mixBlendMode: 'multiply' }}
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: data.brand.color + '20' }}>
              <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: data.brand.color }} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-gray-900">{data.brand.name}</h3>
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
