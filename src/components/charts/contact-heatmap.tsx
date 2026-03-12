'use client'

import { type HeatmapCell } from '@/lib/types/database'
import { DAYS_TR } from '@/lib/utils'

// 08:30 – 18:00 → tam saatler: 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18
const DISPLAY_HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // [8..18]

export function ContactHeatmap({ data, title = 'İletişim Yoğunluğu' }: { data: HeatmapCell[]; title?: string }) {
  const visibleData = data.filter(d => d.hour >= 8 && d.hour <= 18)
  const maxCount = Math.max(...visibleData.map((d) => d.count), 1)
  const getCell = (day: number, hour: number) => data.find((d) => d.day === day && d.hour === hour)
  const getOpacity = (count: number) => count === 0 ? 0.04 : 0.15 + (count / maxCount) * 0.85

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.04] p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">08:30 – 18:00 mesai saatleri</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span>Az</span>
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((o) => (
              <div key={o} className="h-3 w-3 rounded-sm" style={{ backgroundColor: `rgba(37, 99, 235, ${o})` }} />
            ))}
          </div>
          <span>Çok</span>
        </div>
      </div>

      {/* Responsive grid — no fixed widths, cells stretch to fill */}
      <div className="flex-1 w-full">
        {/* Hour labels */}
        <div className="flex items-center mb-1 w-full">
          <div className="w-9 shrink-0" />
          <div className="flex flex-1 gap-px">
            {DISPLAY_HOURS.map((h) => (
              <div key={h} className="flex-1 text-center text-[9px] font-medium text-gray-500">
                {String(h).padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>

        {/* Grid rows */}
        {DAYS_TR.map((day, dayIdx) => (
          <div key={day} className="flex items-center gap-px mb-px w-full">
            <div className="w-9 shrink-0 text-[11px] text-gray-500 font-medium pr-1 text-right">{day}</div>
            <div className="flex flex-1 gap-px">
              {DISPLAY_HOURS.map((hour) => {
                const count = getCell(dayIdx, hour)?.count ?? 0
                return (
                  <div
                    key={hour}
                    title={`${day} ${String(hour).padStart(2, '0')}:00 → ${count} temas`}
                    className="flex-1 h-7 rounded-sm cursor-pointer transition-all hover:brightness-90"
                    style={{
                      backgroundColor: `rgba(37, 99, 235, ${getOpacity(count)})`,
                      border: count > 0 ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid #F3F4F6',
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
