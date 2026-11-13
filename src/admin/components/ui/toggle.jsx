import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/admin/lib/utils"
import { Toggle as TogglePrimitive } from "radix-ui"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap text-ut-700 transition-[color,background-color,box-shadow] outline-none hover:bg-ut-50 hover:text-ut-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=on]:bg-ut-50 data-[state=on]:text-ut-800 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-ut-300 bg-white shadow-xs",
      },
      size: {
        default: "h-10 min-w-10 px-4",
        sm: "h-9 min-w-9 px-3",
        lg: "h-10 min-w-10 px-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Toggle, toggleVariants }
