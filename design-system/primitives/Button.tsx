import React from 'react'
import { cn } from '../utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'white' | 'danger'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-kaboo-primary text-white hover:bg-opacity-90',
  secondary: 'bg-kaboo-primary/10 text-kaboo-primary hover:bg-kaboo-primary/20',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 shadow-none',
  white:     'bg-white text-kaboo-primary hover:bg-gray-50',
  danger:    'bg-red-500 text-white hover:bg-red-600',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', fullWidth = false, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'py-4 px-6 rounded-2xl font-bold transition-all duration-200',
          'active:scale-95 flex items-center justify-center gap-2 shadow-sm',
          variantClasses[variant],
          fullWidth && 'w-full',
          disabled && 'opacity-45 cursor-not-allowed pointer-events-none shadow-none saturate-50',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
