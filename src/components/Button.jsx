import { ArrowUpRight } from 'lucide-react'

/** The one filled button: coral block, dark type. `outline` gives the bordered tag-style twin. */
export default function Button({ children, href, onClick, type, outline = false, className = '', ...props }) {
  const Tag = href ? 'a' : 'button'
  const look = outline
    ? 'border border-sky-soft/60 text-sky-soft hover:border-sky-soft hover:bg-sky-soft hover:text-ground'
    : 'bg-coral text-ground hover:bg-[#f27c5d]'
  return (
    <Tag
      href={href}
      onClick={onClick}
      type={href ? undefined : type || 'button'}
      className={`group inline-flex h-12 items-center gap-3 rounded-[4px] px-5 text-[15px] font-medium transition-[background-color,color,border-color,transform] duration-150 ease-out active:scale-[0.97] ${look} ${className}`}
      {...props}
    >
      {children}
      <ArrowUpRight
        size={18}
        strokeWidth={1.75}
        aria-hidden="true"
        className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      />
    </Tag>
  )
}
