'use client'

import { useState } from 'react'
import { Menu, Car } from 'lucide-react'
import { Sidebar } from './sidebar'
import { PageHero } from './page-hero'
import type { UserProfile } from '@/lib/types/database'

export function LayoutShell({ profile, children }: {
  profile: UserProfile | null
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        profile={profile}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-slate-900 text-white shrink-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
            aria-label="Menüyü Aç"
          >
            <Menu className="h-5 w-5 text-slate-300" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center shrink-0">
              <Car className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm text-white">EA CRM</span>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto dot-grid">
          <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
            <PageHero />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
