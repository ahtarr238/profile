import * as React from "react"
import { cn } from "@/admin/lib/utils"

function Textarea({
  className,
  ...props
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full rounded-lg border border-ut-300 bg-white px-3.5 py-3 text-base text-ut-900 shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-ut-500 focus-visible:border-brand-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props} />
  );
}

export { Textarea }
