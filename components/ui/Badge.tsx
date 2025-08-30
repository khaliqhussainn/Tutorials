'use client'
import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "primary" | "secondary" | "destructive" | "outline"
  className?: string
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-gray-100 text-gray-800",
        variant === "primary" && "bg-blue-600 text-white",
        variant === "secondary" && "bg-gray-100 text-gray-800",
        variant === "destructive" && "bg-red-600 text-white",
        variant === "outline" && "border border-gray-200 text-gray-800",
        className
      )}
    >
      {children}
    </span>
  )
}
