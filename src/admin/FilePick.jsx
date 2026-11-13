import { useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { FeaturedIcon } from './ui'
import { cn } from '@/admin/lib/utils'

/** Untitled UI's file uploader: click or drop. The file is prepared in the browser, nothing is sent yet. */
export default function FilePick({ label, hint, accept, onPick, preview, kind = 'image' }) {
  const [over, setOver] = useState(false)
  const take = (f) => f && onPick(f)
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium text-ut-700">{label}</span>
      {preview &&
        (kind === 'video' ? (
          <video src={preview} muted playsInline controls className="aspect-video w-full rounded-lg border border-ut-200 bg-ut-900 object-contain" />
        ) : (
          <img src={preview} alt="" className="max-h-56 w-full rounded-lg border border-ut-200 bg-white object-contain" />
        ))}
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          take(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center rounded-xl border bg-white px-6 py-4 text-center transition-[border-color,box-shadow] focus-within:ring-4 focus-within:ring-brand-100 hover:border-brand-300',
          over ? 'border-brand-600 ring-4 ring-brand-100' : 'border-ut-200',
        )}
      >
        <FeaturedIcon icon={UploadCloud} />
        <span className="mt-3 text-sm text-ut-600">
          <span className="font-semibold text-brand-700">{preview ? 'Click to replace' : 'Click to upload'}</span> or drag and drop
        </span>
        {hint && <span className="mt-1 text-xs leading-[18px] text-ut-600">{hint}</span>}
        <input
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            take(f)
          }}
        />
      </label>
    </div>
  )
}
