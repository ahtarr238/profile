// Small building blocks shared by the admin screens: shadcn underneath, Untitled UI on top.
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { Input } from '@/admin/components/ui/input'
import { Label } from '@/admin/components/ui/label'
import { Textarea } from '@/admin/components/ui/textarea'
import { cn } from '@/admin/lib/utils'

/** The mark: the site's "ahtar." in a square, then the word. */
export function Brand({ suffix = 'admin', className = '' }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-[#070c1a] text-[15px] font-semibold text-white shadow-xs">
        <span>
          a<span className="text-brand-500">.</span>
        </span>
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.01em] text-ut-900">
        ahtar<span className="text-brand-500">.</span> <span className="font-normal text-ut-500">{suffix}</span>
      </span>
    </span>
  )
}

/** Untitled UI's featured icon: an icon in a soft square with a ring. */
export function FeaturedIcon({ icon: Icon, tone = 'gray', className = '' }) {
  const look = {
    gray: 'border-ut-200 bg-white text-ut-700 shadow-xs',
    brand: 'border-brand-100 bg-brand-50 text-brand-600',
    success: 'border-[#d1fadf] bg-[#ecfdf3] text-[#079455]',
    error: 'border-[#fee4e2] bg-[#fef3f2] text-[#d92d20]',
  }[tone]
  return (
    <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg border', look, className)}>
      <Icon className="size-5" strokeWidth={1.9} aria-hidden="true" />
    </span>
  )
}

export function Field({ label, hint, error, as = 'input', id, className = '', ...props }) {
  const Control = as === 'textarea' ? Textarea : Input
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id} className="text-ut-700">
        {label}
      </Label>
      <Control id={id} aria-invalid={error ? 'true' : undefined} {...props} />
      {hint && !error && <p className="text-sm text-ut-600">{hint}</p>}
      {error && <p className="text-sm text-[#d92d20]">{error}</p>}
    </div>
  )
}

/** A status line in Untitled UI's alert style. */
export function Notice({ tone = 'info', children, className = '' }) {
  if (!children) return null
  const look = {
    info: { box: 'border-ut-300 bg-ut-25 text-ut-700', icon: Info, iconColor: 'text-ut-600' },
    success: { box: 'border-[#75e0a7] bg-[#f6fef9] text-[#067647]', icon: CheckCircle2, iconColor: 'text-[#079455]' },
    error: { box: 'border-[#fda29b] bg-[#fffbfa] text-[#b42318]', icon: AlertCircle, iconColor: 'text-[#d92d20]' },
  }[tone]
  const Icon = look.icon
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-xl border p-4 text-sm shadow-xs', look.box, className)}>
      <Icon className={cn('mt-px size-5 shrink-0', look.iconColor)} strokeWidth={1.9} aria-hidden="true" />
      <p className="leading-5 font-medium">{children}</p>
    </div>
  )
}
