import React from 'react'
import { cn } from '../utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          aria-invalid={Boolean(error)}
          className={cn(
            'w-full px-4 py-3 rounded-xl border bg-white text-gray-900',
            'placeholder:text-gray-400 transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-kaboo-primary/30 focus:border-kaboo-primary',
            error
              ? 'border-red-400 focus:ring-red-300 focus:border-red-500'
              : 'border-gray-200 hover:border-gray-300',
            props.disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            className,
          )}
          {...props}
        />

        {error && (
          <span id={`${inputId}-error`} role="alert" className="text-xs text-red-600">
            {error}
          </span>
        )}

        {hint && !error && (
          <span id={`${inputId}-hint`} className="text-xs text-gray-500">
            {hint}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
