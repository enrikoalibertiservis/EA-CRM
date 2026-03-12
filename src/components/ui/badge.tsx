import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border',
        {
          'bg-blue-50 text-blue-700 border-blue-200': variant === 'default',
          'bg-gray-100 text-gray-700 border-gray-200': variant === 'secondary',
          'bg-green-50 text-green-700 border-green-200': variant === 'success',
          'bg-amber-50 text-amber-700 border-amber-200': variant === 'warning',
          'bg-red-50 text-red-700 border-red-200': variant === 'danger',
          'bg-transparent text-gray-600 border-gray-300': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  )
}
