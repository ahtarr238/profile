// Small building blocks shared by the admin screens, in the site's own look.

export function Shell({ children, wide = false }) {
  return (
    <div className="min-h-svh bg-ground text-sky-soft">
      <div className={`mx-auto px-5 py-10 md:px-8 md:py-14 ${wide ? 'max-w-[1100px]' : 'max-w-[440px]'}`}>{children}</div>
    </div>
  )
}

export function Brand({ suffix = 'admin' }) {
  return (
    <p className="font-display text-[22px] tracking-[-0.03em]">
      ahtar<span className="text-coral">.</span> <span className="text-mist">{suffix}</span>
    </p>
  )
}

export function Field({ label, hint, error, as = 'input', id, className = '', ...props }) {
  const Tag = as
  return (
    <label htmlFor={id} className={`block ${className}`}>
      <span className="block text-[13px] text-mist">{label}</span>
      <Tag
        id={id}
        aria-invalid={error ? 'true' : undefined}
        className={`mt-1.5 block w-full rounded-[4px] border bg-tile px-3 text-[15px] text-sky-soft outline-none transition-colors duration-150 placeholder:text-dim focus:border-coral ${
          as === 'textarea' ? 'min-h-28 py-2.5' : 'h-11'
        } ${error ? 'border-coral' : 'border-sky-soft/20'}`}
        {...props}
      />
      {hint && !error && <span className="mt-1 block text-[12px] text-dim">{hint}</span>}
      {error && <span className="mt-1 block text-[12px] text-coral">{error}</span>}
    </label>
  )
}

export function Btn({ kind = 'primary', className = '', ...props }) {
  const look = {
    primary: 'bg-coral text-ground hover:bg-[#f27c5d]',
    ghost: 'border border-sky-soft/30 text-sky-soft hover:border-sky-soft/70',
    danger: 'border border-coral/60 text-coral hover:bg-coral hover:text-ground',
    plain: 'text-mist hover:text-sky-soft',
  }[kind]
  return (
    <button
      type="button"
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-[4px] px-4 text-[14px] font-medium transition-[background-color,border-color,color,opacity] duration-150 ease-out disabled:pointer-events-none disabled:opacity-40 ${look} ${className}`}
      {...props}
    />
  )
}

export function Notice({ tone = 'info', children }) {
  if (!children) return null
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-[4px] px-3 py-2.5 text-[14px] ${tone === 'error' ? 'bg-coral/15 text-coral' : 'bg-sky-soft/10 text-sky-soft'}`}
    >
      {children}
    </p>
  )
}
