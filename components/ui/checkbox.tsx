"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean | "indeterminate"
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, onClick, onKeyDown, ...props }, ref) => {
    const isChecked = checked === true

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      onCheckedChange?.(!isChecked)
      onClick?.(e)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === " ") {
        e.preventDefault()
        if (!disabled) onCheckedChange?.(!isChecked)
      }
      onKeyDown?.(e)
    }

    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked === "indeterminate" ? "mixed" : isChecked}
        data-state={isChecked ? "checked" : "unchecked"}
        disabled={disabled}
        ref={ref}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center transition-colors text-primary-foreground",
          isChecked ? "bg-primary border-primary" : "bg-transparent",
          className
        )}
        {...props}
      >
        {isChecked && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
      </button>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
