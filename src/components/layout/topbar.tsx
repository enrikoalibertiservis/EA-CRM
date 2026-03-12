'use client'

import { Bell } from 'lucide-react'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 sticky top-0 z-30" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 truncate mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button className="h-8 w-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors relative">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
