import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, placeholder, children, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full h-9 rounded-xl border bg-white px-3 pr-8 text-xs font-medium text-gray-700 appearance-none',
              'shadow-sm hover:shadow transition-all',
              'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300',
              'disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400',
              error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 hover:border-gray-300',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {children}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
