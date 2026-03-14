'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LabelList } from 'recharts'
import { type ChannelStats } from '@/lib/types/database'
import { Radio } from 'lucide-react'

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: ChannelStats }[] }) => {
  if (active && payload && payload.length) {
    const item = payload[0]
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
        <p className="font-semibold text-gray-900">{item.name}</p>
        <p className="text-gray-600">{item.value} temas ({item.payload.percentage.toFixed(1)}%)</p>
      </div>
    )
  }
  return null
}

export function ChannelChart({ data, title = 'Temas Kanalları Dağılımı' }: { data: ChannelStats[]; title?: string }) {
  const chartData = data.map((d) => ({
    name: d.channel.name,
    value: d.count,
    color: d.channel.color,
    percentage: d.percentage,
  }))

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-black/[0.04] p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
          <Radio className="h-4 w-4 text-violet-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
          Henüz veri yok
        </div>
      ) : (
        <div className="flex items-center gap-4 flex-1">
          <div className="w-44 h-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%" cy="50%"
                  innerRadius={42} outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="percentage"
                    position="inside"
                    formatter={(v: unknown) => (v as number) >= 8 ? `%${Math.round(v as number)}` : ''}
                    style={{ fontSize: 10, fontWeight: 700, fill: '#fff' }}
                  />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {data.map((item) => (
              <div key={item.channel.id} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.channel.color }} />
                <span className="text-xs text-gray-600 flex-1 truncate">{item.channel.name}</span>
                <span className="text-xs font-bold text-gray-900">{item.count}</span>
                <span className="text-[10px] font-semibold w-9 text-right" style={{ color: item.channel.color }}>
                  %{item.percentage.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
