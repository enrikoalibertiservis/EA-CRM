'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { type ChannelStats } from '@/lib/types/database'
import { Radio } from 'lucide-react'

export function ChannelChart({ data, title = 'Temas Kanalları Dağılımı' }: { data: ChannelStats[]; title?: string }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const yAxisWidth = Math.min(200, Math.max(...data.map(d => d.channel.name.length * 7), 60) + 12)

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.04] p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-5 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
          <Radio className="h-4 w-4 text-violet-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-400">Kaynak kanal bazında müşteri dağılımı</p>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
          Henüz veri yok
        </div>
      ) : (
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={Math.max(240, data.length * 46)}>
            <BarChart
              layout="vertical"
              data={data.map(d => ({ name: d.channel.name, count: d.count, color: d.channel.color, pct: d.percentage }))}
              margin={{ top: 4, right: 55, left: 0, bottom: 4 }}
              barCategoryGap="30%"
            >
              <defs>
                {data.map((d, i) => (
                  <linearGradient key={i} id={`gradCh${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={d.channel.color} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={d.channel.color} stopOpacity={1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis
                type="number"
                allowDecimals={false}
                domain={[0, maxCount + 1]}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={yAxisWidth}
                tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload as { name: string; count: number; pct: number }
                  return (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-2.5 text-xs">
                      <p className="font-bold text-gray-900 mb-1">{d.name}</p>
                      <p className="text-gray-600">Adet: <span className="font-semibold text-gray-900">{d.count}</span></p>
                      <p className="text-gray-600">Oran: <span className="font-semibold text-gray-900">%{d.pct.toFixed(1)}</span></p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" radius={[0, 7, 7, 0]} maxBarSize={30}>
                {data.map((_, i) => (
                  <Cell key={i} fill={`url(#gradCh${i})`} />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
