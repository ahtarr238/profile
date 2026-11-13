import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/admin/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-100 outline-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-brand-600 text-white shadow-[0_1px_2px_rgb(16_24_40/0.05),inset_0_0_0_1px_rgb(16_24_40/0.18),inset_0_-2px_0_rgb(16_24_40/0.05)] hover:bg-brand-700",
        destructive:
          "bg-[#d92d20] text-white shadow-xs hover:bg-[#b42318] focus-visible:ring-[#fee4e2]",
        outline:
          "border border-ut-300 bg-white text-ut-700 shadow-xs hover:bg-ut-50 hover:text-ut-800",
        secondary:
          "border border-ut-300 bg-white text-ut-700 shadow-xs hover:bg-ut-50 hover:text-ut-800",
        ghost:
          "text-ut-600 hover:bg-ut-50 hover:text-ut-700",
        link: "text-brand-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-3.5",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 px-3",
        lg: "h-11 px-4 text-base",
        icon: "size-10",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
