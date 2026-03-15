'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const wrapperRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const calcPosition = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropHeight = Math.min(224, options.length * 36 + 48)
    const goUp = spaceBelow < dropHeight && rect.top > dropHeight

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: Math.max(rect.width, 160),
      zIndex: 9999,
      ...(goUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    })
  }, [options.length])

  useEffect(() => {
    if (open) calcPosition()
  }, [open, calcPosition])

  useEffect(() => {
    const handleClose = (e: MouseEvent) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
        !(e.target as Element)?.closest('[data-styled-dropdown]')
      ) setOpen(false)
    }
    const handleScroll = () => { if (open) calcPosition() }
    document.addEventListener('mousedown', handleClose)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
    return () => {
      document.removeEventListener('mousedown', handleClose)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [open, calcPosition])

  const selected = options.find(o => o.id === value)

  const dropdown = open ? (
    <div
      data-styled-dropdown
      style={dropdownStyle}
      className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden"
    >
      <div className="max-h-56 overflow-y-auto py-1">
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
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
            onMouseDown={e => e.preventDefault()}
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
  ) : null

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label className="text-[11px] font-medium text-gray-500 block mb-1">
          {label}
        </label>
      )}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 border text-xs font-medium transition-all bg-white shadow-sm hover:shadow ${
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

      {typeof window !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}
