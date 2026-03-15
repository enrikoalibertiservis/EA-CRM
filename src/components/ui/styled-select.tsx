'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export interface StyledSelectOption {
  id: string
  label: string
  color?: string
}

interface StyledSelectProps {
  label?: string
  options: StyledSelectOption[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
  compact?: boolean
}

export function StyledSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Tümü',
  className = '',
  compact = false,
}: StyledSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.id === value)

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && (
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 rounded-xl border text-xs font-medium transition-all bg-white shadow-sm hover:shadow ${
          compact ? 'h-7 rounded-lg' : 'h-9 rounded-xl'
        } ${
          value
            ? 'border-blue-300 bg-blue-50/60 text-blue-700'
            : 'border-gray-200 text-gray-500 hover:border-gray-300'
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.color && (
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
          )}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[160px] bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {/* Placeholder / temizle seçeneği */}
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                !value ? 'font-semibold text-blue-600 bg-blue-50/40' : 'text-gray-500'
              }`}
            >
              <span className="h-4 w-4 rounded border border-gray-200 flex items-center justify-center shrink-0">
                {!value && <span className="h-2 w-2 rounded-full bg-blue-500" />}
              </span>
              {placeholder}
            </button>

            {options.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onChange(opt.id); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                  value === opt.id ? 'font-semibold text-blue-600 bg-blue-50/40' : 'text-gray-600'
                }`}
              >
                <span className="h-4 w-4 rounded border border-gray-200 flex items-center justify-center shrink-0">
                  {value === opt.id && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                </span>
                {opt.color && (
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                )}
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
