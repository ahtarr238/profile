import * as React from "react"
import { cn } from "@/admin/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-ut-300 bg-white px-3.5 py-2 text-base text-ut-900 shadow-xs transition-[border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-ut-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-brand-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100",
        "aria-invalid:border-[#fda29b] aria-invalid:ring-[#fee4e2]",
        className
      )}
      {...props} />
  );
}

export { Input }
