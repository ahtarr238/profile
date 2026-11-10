/** Outlined label, as in a case-study header. */
export default function Tag({ children, className = '' }) {
  return (
    <span
      className={`inline-flex h-8 items-center rounded-[4px] border border-sky-soft/50 px-3 text-[13px] text-sky-soft ${className}`}
    >
      {children}
    </span>
  )
}
