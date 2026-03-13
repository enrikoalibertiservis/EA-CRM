'use client'

import { useState, useMemo } from 'react'
import { type HeatmapCell } from '@/lib/types/database'

const DAYS = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ']
const DAYS_FULL = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

// 08:00 – 18:00
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8)

export function ContactHeatmap({ data, title = 'İletişim Yoğunluğu' }: { data: HeatmapCell[]; title?: string }) {
  const now = new Date()
  const todayIdx = (now.getDay() + 6) % 7 // Mon=0
  const [selectedDay, setSelectedDay] = useState(todayIdx)

  const dayData = useMemo(() => {
    return HOURS.map(hour => {
      const cell = data.find(d => d.day === selectedDay && d.hour === hour)
      return { hour, count: cell?.count ?? 0 }
    })
  }, [data, selectedDay])

  const maxCount = Math.max(...dayData.map(d => d.count), 1)
  const peakHour = dayData.reduce((best, cur) => cur.count > best.count ? cur : best, dayData[0])

  // Color based on intensity
  const getBarColor = (count: number, isPeak: boolean) => {
    if (count === 0) return '#E5E7EB'
    if (isPeak) return '#1d4ed8'
    const ratio = count / maxCount
    if (ratio > 0.7) return '#3b82f6'
    if (ratio > 0.4) return '#60a5fa'
    return '#93c5fd'
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.04] p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Gün & saat bazlı temas dağılımı</p>
        </div>
        {peakHour.count > 0 && (
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-blue-700">
              {String(peakHour.hour).padStart(2, '0')}:00 — en yoğun
            </span>
          </div>
        )}
      </div>

      {/* Day tabs */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        {DAYS.map((day, idx) => {
          const dayTotal = data.filter(d => d.day === idx).reduce((s, d) => s + d.count, 0)
          const isSelected = selectedDay === idx
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(idx)}
              className={`flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {day}
              {dayTotal > 0 && (
                <span className={`text-[9px] font-bold ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                  {dayTotal}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Bar chart */}
      <div className="flex-1 flex flex-col">
        {/* Bars */}
        <div className="flex items-end gap-1 h-28 px-1">
          {dayData.map(({ hour, count }) => {
            const heightPct = count === 0 ? 6 : Math.max((count / maxCount) * 100, 12)
            const isPeak = count > 0 && count === peakHour.count
            const barColor = getBarColor(count, isPeak)
            return (
              <div
                key={hour}
                className="flex-1 flex flex-col items-center justify-end gap-0.5 group"
                title={`${DAYS_FULL[selectedDay]} ${String(hour).padStart(2, '0')}:00 → ${count} temas`}
              >
                {/* Count label on hover */}
                {count > 0 && (
                  <span className="text-[9px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {count}
                  </span>
                )}
                {/* Bar */}
                <div
                  className="w-full rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: barColor,
                    minHeight: '4px',
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Hour labels */}
        <div className="flex items-center gap-1 px-1 mt-1.5">
          {dayData.map(({ hour }) => (
            <div key={hour} className="flex-1 text-center text-[9px] text-gray-400 font-medium">
              {hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {dayData.every(d => d.count === 0) && (
          <div className="absolute inset-x-0 flex flex-col items-center justify-center gap-1 pointer-events-none" style={{ top: '50%', transform: 'translateY(-50%)' }}>
            <p className="text-xs text-gray-400 text-center">Bu gün için temas kaydı yok</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-1.5">
          {[
            { color: '#93c5fd', label: 'Düşük' },
            { color: '#60a5fa', label: 'Orta' },
            { color: '#3b82f6', label: 'Yüksek' },
            { color: '#1d4ed8', label: 'Zirve' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
        <span className="text-[10px] text-gray-400">08:00 – 18:00</span>
      </div>
    </div>
  )
}
