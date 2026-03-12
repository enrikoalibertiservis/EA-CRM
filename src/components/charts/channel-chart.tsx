'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { type ChannelStats } from '@/lib/types/database'

interface ChannelChartProps {
  data: ChannelStats[]
  title?: string
}

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

export function ChannelChart({ data, title = 'Temas Kanalları Dağılımı' }: ChannelChartProps) {
  const chartData = data.map((d) => ({
    name: d.channel.name,
    value: d.count,
    color: d.channel.color,
    percentage: d.percentage,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          Henüz veri yok
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-40 h-40 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1.5">
            {data.map((item) => (
              <div key={item.channel.id} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.channel.color }}
                />
                <span className="text-xs text-gray-600 flex-1 truncate">{item.channel.name}</span>
                <span className="text-xs font-semibold text-gray-900">{item.count}</span>
                <span className="text-xs text-gray-400 w-10 text-right">{item.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
