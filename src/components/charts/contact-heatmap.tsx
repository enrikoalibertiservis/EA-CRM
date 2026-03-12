'use client'

import { type HeatmapCell } from '@/lib/types/database'
import { DAYS_TR } from '@/lib/utils'

interface ContactHeatmapProps {
  data: HeatmapCell[]
  title?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const WORK_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

export function ContactHeatmap({ data, title = 'İletişim Yoğunluğu' }: ContactHeatmapProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  const getCell = (day: number, hour: number) =>
    data.find((d) => d.day === day && d.hour === hour)

  const getOpacity = (count: number) => {
    if (count === 0) return 0.04
    return 0.15 + (count / maxCount) * 0.85
  }

  const getTooltip = (day: number, hour: number, count: number) =>
    `${DAYS_TR[day]} ${String(hour).padStart(2, '0')}:00 → ${count} temas`

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span>Az</span>
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((o) => (
              <div
                key={o}
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: `rgba(37, 99, 235, ${o})` }}
              />
            ))}
          </div>
          <span>Çok</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Hour labels */}
          <div className="flex items-center mb-1">
            <div className="w-10 flex-shrink-0" />
            <div className="flex gap-0.5">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className={`w-7 text-center text-[9px] font-medium ${
                    WORK_HOURS.includes(h) ? 'text-gray-500' : 'text-gray-300'
                  }`}
                >
                  {h % 2 === 0 ? `${String(h).padStart(2, '0')}` : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Grid */}
          {DAYS_TR.map((day, dayIdx) => (
            <div key={day} className="flex items-center gap-0.5 mb-0.5">
              <div className="w-10 flex-shrink-0 text-xs text-gray-500 font-medium pr-2 text-right">
                {day}
              </div>
              <div className="flex gap-0.5">
                {HOURS.map((hour) => {
                  const cell = getCell(dayIdx, hour)
                  const count = cell?.count ?? 0
                  const opacity = getOpacity(count)
                  return (
                    <div
                      key={hour}
                      title={getTooltip(dayIdx, hour, count)}
                      className="h-7 w-7 rounded-sm cursor-pointer transition-all hover:scale-110 hover:shadow-sm"
                      style={{
                        backgroundColor: `rgba(37, 99, 235, ${opacity})`,
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

      <p className="text-xs text-gray-400 mt-2">* Her hücre hover edildiğinde detay görüntülenir</p>
    </div>
  )
}
