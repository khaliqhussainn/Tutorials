// components/ui/Button.tsx
import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, forwardRef } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
          variant === 'primary' && 'bg-primary-600 text-white hover:bg-primary-700',
          variant === 'secondary' && 'bg-dark-100 text-dark-900 hover:bg-dark-200',
          variant === 'outline' && 'border border-dark-300 text-dark-700 hover:bg-dark-50',
          variant === 'ghost' && 'hover:bg-dark-100',
          size === 'sm' && 'h-9 px-3 text-sm',
          size === 'md' && 'h-10 px-4',
          size === 'lg' && 'h-11 px-8',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }