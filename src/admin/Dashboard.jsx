import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowDown,
  ArrowUp,
  Award,
  ChartColumn,
  Clapperboard,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  LogOut,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { GitHub, UPLOADS_DIR, uploadRepoPath } from './github'
import { checkVideo, imageToWebp, MAX_VIDEO_MB, pdfToWebp, videoPoster } from './media'
import { Brand, FeaturedIcon, Field, Notice } from './ui'
import FilePick from './FilePick'
import { friendly } from './errors'
import StatsPanel from './StatsPanel'
import SeoPanel from './SeoPanel'
import { SessionCard, SessionClock, SessionWarning } from './SessionClock'
import { useTimeLeft } from './useTimeLeft'
import { SESSION_MINUTES } from './config'
import { Avatar, AvatarFallback } from '@/admin/components/ui/avatar'
import { Badge } from '@/admin/components/ui/badge'
import { Button } from '@/admin/components/ui/button'
import { Card } from '@/admin/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/admin/components/ui/dropdown-menu'
import { Label } from '@/admin/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/admin/components/ui/sheet'
import { Switch } from '@/admin/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/admin/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/admin/components/ui/tooltip'
import { cn } from '@/admin/lib/utils'

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')

const today = () => new Date().toISOString().slice(0, 10)
const splitTags = (text) =>
  String(text || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8)
const httpsOnly = (v) => !v || /^https:\/\/[^\s"'<>]+$/.test(v)

const KINDS = {
  projects: {
    label: 'Projects',
    one: 'project',
    thumb: (r) => r.poster,
    meta: (r) => [r.role, (r.tags || []).join(' · ')].filter(Boolean).join(' — '),
    blank: () => ({ id: '', title: '', description: '', tags: [], title_id: '', description_id: '', tags_id: [], role: '', video: '', poster: '', published: true }),
  },
  certificates: {
    label: 'Certificates',
    one: 'certificate',
    thumb: (r) => r.image,
    meta: (r) => [r.issuer, r.issued_on].filter(Boolean).join(' · '),
    blank: () => ({ id: '', title: '', issuer: '', issued_on: today(), image: '', alt: '', verify: '', published: true }),
  },
}
const FILE_FIELDS = ['image', 'video', 'poster']

/** Add/edit form, in a sheet from the right. Files are prepared here and handed back; nothing reaches GitHub until Publish. */
function Editor({ kind, row, taken, previewOf, onClose, onDone }) {
  const isNew = !row.id
  const [v, setV] = useState(() => ({ ...row, tagsText: (row.tags || []).join(', '), tagsIdText: (row.tags_id || []).join(', ') }))
  const [idTouched, setIdTouched] = useState(!isNew)
  const [files, setFiles] = useState({}) // field -> { blob, ext, preview }
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setV((o) => ({ ...o, [key]: value, ...(key === 'title' && !idTouched ? { id: slugify(value) } : {}) }))
  }
  const stage = (field, blob, ext) =>
    setFiles((f) => {
      if (f[field]) URL.revokeObjectURL(f[field].preview)
      return { ...f, [field]: { blob, ext, preview: URL.createObjectURL(blob) } }
    })

  const run = async (label, fn) => {
    setError('')
    setBusy(label)
    try {
      await fn()
    } catch (e) {
      setError(friendly(e))
    }
    setBusy('')
  }

  const pickCertificate = (file) =>
    run('Preparing the image…', async () => {
      stage('image', file.type === 'application/pdf' ? await pdfToWebp(file) : await imageToWebp(file), 'webp')
    })
  const pickVideo = (file) =>
    run('Taking a still for the cover…', async () => {
      checkVideo(file)
      stage('video', file, file.type === 'video/webm' ? 'webm' : 'mp4')
      if (!files.poster) stage('poster', await videoPoster(file), 'webp')
    })
  const pickPoster = (file) => run('Preparing the image…', async () => stage('poster', await imageToWebp(file, 1280), 'webp'))

  const save = (e) => {
    e.preventDefault()
    setError('')
    const title = v.title.trim()
    const id = slugify(v.id || title)
    if (!title) return setError('Give it a title.')
    if (!id) return setError('The short name needs at least one letter or number.')
    if (taken.has(id) && id !== row.id) return setError('Another item already uses that short name.')
    if (kind === 'certificates') {
      if (!v.issued_on) return setError('Pick the date on the certificate.')
      if (!files.image && !v.image) return setError('Add the certificate file (PDF or image).')
      if (!httpsOnly(v.verify?.trim())) return setError('The verify link must start with https://')
    } else if (!files.video && !v.video) return setError('Add the intro video.')

    const issuer = (v.issuer || '').trim()
    const item =
      kind === 'certificates'
        ? {
            id,
            title,
            issuer,
            issued_on: v.issued_on,
            image: v.image,
            alt: v.alt.trim() || `Certificate for ${title}${issuer ? `, ${issuer}` : ''}`,
            verify: v.verify?.trim() || '',
            published: !!v.published,
          }
        : {
            id,
            title,
            description: v.description.trim(),
            tags: splitTags(v.tagsText),
            // Bahasa Indonesia versions; left empty, the site shows the English ones
            title_id: (v.title_id || '').trim(),
            description_id: (v.description_id || '').trim(),
            tags_id: splitTags(v.tagsIdText),
            role: v.role.trim(),
            video: v.video,
            poster: v.poster,
            published: !!v.published,
          }
    onDone(item, files)
  }

  const k = KINDS[kind]
  return (
    <form onSubmit={save} className="flex h-full min-h-0 flex-col">
      <SheetHeader className="pr-16">
        <SheetTitle>
          {isNew ? 'Add' : 'Edit'} {k.one}
        </SheetTitle>
        <SheetDescription>Nothing goes live until you press Publish.</SheetDescription>
      </SheetHeader>

      <div className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto overscroll-contain px-5 py-6 md:px-6">
        <Field id="title" label="Title" required value={v.title} onChange={set('title')} maxLength={160} />
        <Field
          id="short"
          label="Short name"
          hint="Its id on the site. Lowercase letters, numbers and dashes."
          value={v.id}
          maxLength={60}
          onChange={(e) => {
            setIdTouched(true)
            set('id')(e)
          }}
        />

        {kind === 'certificates' ? (
          <>
            <FilePick
              label="Certificate"
              hint="The PDF straight from Dicoding or MySkill. The first page becomes the image."
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onPick={pickCertificate}
              preview={files.image?.preview || previewOf(v.image)}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="issuer" label="Issued by" value={v.issuer} onChange={set('issuer')} maxLength={160} placeholder="Dicoding Indonesia" />
              <Field id="issued_on" label="Date on the certificate" type="date" required value={v.issued_on} onChange={set('issued_on')} />
            </div>
            <Field
              id="verify"
              label="Verify link (optional)"
              type="url"
              placeholder="https://www.dicoding.com/certificates/…"
              value={v.verify || ''}
              onChange={set('verify')}
              error={httpsOnly(v.verify?.trim()) ? '' : 'Must start with https://'}
            />
            <Field id="alt" label="Description for screen readers (optional)" value={v.alt} onChange={set('alt')} maxLength={300} />
          </>
        ) : (
          <>
            <FilePick
              kind="video"
              label="Intro video"
              hint={`MP4 or WebM, up to ${MAX_VIDEO_MB} MB. A cover image is taken from it automatically.`}
              accept="video/mp4,video/webm"
              onPick={pickVideo}
              preview={files.video?.preview || previewOf(v.video)}
            />
            <FilePick
              label="Cover image (optional)"
              hint="JPG, PNG or WebP. Shown before the video plays."
              accept="image/jpeg,image/png,image/webp"
              onPick={pickPoster}
              preview={files.poster?.preview || previewOf(v.poster)}
            />
            <Field id="description" as="textarea" label="Description" value={v.description} onChange={set('description')} maxLength={1200} />
            <Field id="tags" label="Tags" hint="Comma separated, up to 8." value={v.tagsText} onChange={set('tagsText')} />
            <Field id="role" label="Your role (optional)" hint="Shows as a badge, e.g. Contributor." value={v.role || ''} onChange={set('role')} maxLength={40} />

            {/* shown to visitors who switch the site to Bahasa Indonesia */}
            <fieldset className="grid gap-5 rounded-xl border border-ut-200 bg-ut-25 p-4 md:p-5">
              <legend className="-ml-1 px-1 text-sm font-semibold text-ut-900">Bahasa Indonesia (optional)</legend>
              <p className="-mt-2 text-sm text-ut-600">Leave any of these empty and visitors reading in Indonesian see the English text instead.</p>
              <Field id="title_id" label="Judul" value={v.title_id || ''} onChange={set('title_id')} maxLength={160} />
              <Field id="description_id" as="textarea" label="Deskripsi" value={v.description_id || ''} onChange={set('description_id')} maxLength={1200} />
              <Field id="tags_id" label="Tag" hint="Pisahkan dengan koma, maksimal 8." value={v.tagsIdText} onChange={set('tagsIdText')} />
            </fieldset>
          </>
        )}

        <div className="flex items-start gap-3 rounded-xl border border-ut-200 p-4">
          <Switch id="published" checked={!!v.published} onCheckedChange={(on) => setV((o) => ({ ...o, published: on }))} className="mt-0.5" />
          <div className="grid gap-0.5">
            <Label htmlFor="published" className="text-ut-700">
              Show on the site
            </Label>
            <p className="text-sm text-ut-600">Hidden items stay in the list here but never ship to visitors.</p>
          </div>
        </div>
      </div>

      <SheetFooter>
        {busy && <Notice>{busy}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={!!busy} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button type="submit" disabled={!!busy} className="flex-1">
            {isNew ? `Add ${k.one}` : 'Keep changes'}
          </Button>
        </div>
      </SheetFooter>
    </form>
  )
}

function IconBtn({ label, icon: Icon, danger = false, ...props }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} className={cn('text-ut-500', danger && 'hover:bg-[#fef3f2] hover:text-[#b42318]')} {...props}>
          <Icon strokeWidth={1.9} aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function Status({ published }) {
  return published ? (
    <Badge variant="success">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-[#17b26a]" />
      Live
    </Badge>
  ) : (
    <Badge variant="secondary">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-ut-400" />
      Hidden
    </Badge>
  )
}

export default function Dashboard({ session, onSignOut }) {
  const gh = useMemo(() => new GitHub(session), [session])
  const timeLeft = useTimeLeft(session.expiresAt)
  const [tab, setTab] = useState('visitors')
  const [base, setBase] = useState(null) // { head, cms } as on GitHub
  const [draft, setDraft] = useState(null)
  const [staged, setStaged] = useState({}) // repo path -> { blob, preview }
  const [removed, setRemoved] = useState([]) // repo paths
  const [log, setLog] = useState([]) // plain-language list of changes, becomes the commit message
  const [editing, setEditing] = useState(null) // the row in the sheet; kept while it slides away
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editKey, setEditKey] = useState(0)
  const [confirm, setConfirm] = useState(null)
  const [status, setStatus] = useState({ tone: 'info', text: 'Loading…' })
  const [publishing, setPublishing] = useState(false)
  const stagedRef = useRef(staged) // read by reset() to free previews, without re-creating it on every change
  useEffect(() => {
    stagedRef.current = staged
  }, [staged])

  const reset = useCallback(() => {
    Object.values(stagedRef.current).forEach((f) => URL.revokeObjectURL(f.preview))
    setStaged({})
    setRemoved([])
    setLog([])
  }, [])

  const load = useCallback(async () => {
    setStatus({ tone: 'info', text: 'Loading…' })
    try {
      const data = await gh.load()
      setBase(data)
      setDraft(structuredClone(data.cms))
      reset()
      setStatus(null)
    } catch (e) {
      setStatus({ tone: 'error', text: friendly(e) })
      if (e.status === 401) onSignOut()
    }
  }, [gh, reset, onSignOut])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first load comes from GitHub
    load()
  }, [load])

  const dirty = log.length > 0
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const previewOf = useCallback((sitePath) => (sitePath && staged[`public${sitePath}`]?.preview) || sitePath || '', [staged])
  const rows = useMemo(() => {
    const list = Array.isArray(draft?.[tab]) ? draft[tab] : []
    return tab === 'certificates' ? [...list].sort((a, b) => b.issued_on.localeCompare(a.issued_on)) : list
  }, [draft, tab])
  const k = KINDS[tab]

  const openEditor = (row) => {
    setEditing(row)
    setEditKey((n) => n + 1)
    setSheetOpen(true)
  }
  const closeEditor = () => setSheetOpen(false)

  // a file leaving the site: forget it if it was only staged, delete it from the repo if it was an upload
  const dropFile = (sitePath) => {
    const repoPath = uploadRepoPath(sitePath)
    if (!repoPath) return
    if (staged[repoPath]) {
      URL.revokeObjectURL(staged[repoPath].preview)
      setStaged((s) => {
        const next = { ...s }
        delete next[repoPath]
        return next
      })
    } else setRemoved((r) => (r.includes(repoPath) ? r : [...r, repoPath]))
  }

  const change = (text, fn) => {
    setDraft((d) => {
      const next = structuredClone(d)
      fn(next[tab])
      return next
    })
    setLog((l) => [...l, text])
  }

  const onEdited = (item, files) => {
    const old = editing
    const next = { ...item }
    for (const field of FILE_FIELDS) {
      const f = files[field]
      if (!f) continue
      const sitePath = `/uploads/${tab}/${crypto.randomUUID()}.${f.ext}`
      setStaged((s) => ({ ...s, [`public${sitePath}`]: { blob: f.blob, preview: f.preview } }))
      if (old[field]) dropFile(old[field])
      next[field] = sitePath
    }
    if (old.id) change(`Edit ${k.one} "${next.title}"`, (list) => list.splice(list.findIndex((r) => r.id === old.id), 1, next))
    else change(`Add ${k.one} "${next.title}"`, (list) => list.push(next))
    closeEditor()
  }

  const togglePublished = (r) =>
    change(`${r.published ? 'Hide' : 'Show'} ${k.one} "${r.title}"`, (list) => {
      const x = list.find((y) => y.id === r.id)
      x.published = !x.published
    })

  const move = (i, d) =>
    change(`Reorder projects`, (list) => {
      const j = i + d
      if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]]
    })

  const remove = (r) => {
    FILE_FIELDS.forEach((f) => r[f] && dropFile(r[f]))
    change(`Delete ${k.one} "${r.title}"`, (list) => list.splice(list.findIndex((y) => y.id === r.id), 1))
    setConfirm(null)
  }

  // the SEO form hands back the whole block, plus a new link-preview picture if one was picked
  const saveSeo = (next, file) => {
    const old = draft?.seo?.share_image
    if (file) {
      const sitePath = `/uploads/seo/${crypto.randomUUID()}.jpg`
      setStaged((s) => ({ ...s, [`public${sitePath}`]: { blob: file.blob, preview: file.preview } }))
      if (old) dropFile(old)
      next = { ...next, share_image: sitePath }
    }
    setDraft((d) => ({ ...d, seo: next }))
    setLog((l) => [...l, 'Update SEO settings'])
  }

  const discard = () => {
    setDraft(structuredClone(base.cms))
    reset()
    setStatus({ tone: 'info', text: 'Changes discarded.' })
  }

  const publish = async () => {
    setPublishing(true)
    setStatus({ tone: 'info', text: Object.keys(staged).length ? 'Uploading files and publishing…' : 'Publishing…' })
    try {
      const unique = [...new Set(log)]
      await gh.commit({
        head: base.head,
        cms: draft,
        add: Object.entries(staged).map(([path, f]) => ({ path, blob: f.blob })),
        remove: removed,
        message: `Admin: ${unique.length === 1 ? unique[0] : `${unique.length} changes`}\n\n${unique.map((t) => `- ${t}`).join('\n')}`,
      })
      await load()
      setStatus({ tone: 'success', text: 'Published. The site updates in about a minute, once Vercel finishes the new build.' })
    } catch (e) {
      setStatus({ tone: 'error', text: friendly(e) })
    }
    setPublishing(false)
  }

  const taken = useMemo(() => new Set((Array.isArray(draft?.[tab]) ? draft[tab] : []).map((r) => r.id)), [draft, tab])
  const counts = { projects: draft?.projects?.length, certificates: draft?.certificates?.length }
  const tabs = [
    { key: 'visitors', label: 'Visitors', icon: ChartColumn },
    { key: 'projects', label: 'Projects', icon: Clapperboard },
    { key: 'certificates', label: 'Certificates', icon: Award },
    { key: 'seo', label: 'SEO', icon: Search },
  ]
  const current = tabs.find((x) => x.key === tab)
  const initials = (session.login || 'a').slice(0, 2).toUpperCase()

  const thumb = (r, className) => (
    <span
      className={cn(
        'relative block aspect-video shrink-0 overflow-hidden rounded-md border border-ut-200',
        tab === 'certificates' ? 'bg-white' : 'bg-ut-100',
        className,
      )}
    >
      {k.thumb(r) && (
        <img
          src={previewOf(k.thumb(r))}
          alt=""
          loading="lazy"
          className={cn('size-full', tab === 'certificates' ? 'object-contain p-1' : 'object-cover', !r.published && 'opacity-50 grayscale')}
        />
      )}
    </span>
  )

  const actions = (r, i) =>
    confirm === r.id ? (
      <div className="flex items-center justify-end gap-2">
        <span className="mr-1 text-sm font-medium text-[#b42318]">Delete?</span>
        <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>
          Keep
        </Button>
        <Button variant="destructive" size="sm" onClick={() => remove(r)}>
          Delete
        </Button>
      </div>
    ) : (
      <div className="flex items-center justify-end gap-0.5">
        {tab === 'projects' && (
          <>
            <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)} icon={ArrowUp} />
            <IconBtn label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} icon={ArrowDown} />
          </>
        )}
        <IconBtn label={r.published ? 'Hide from site' : 'Show on site'} onClick={() => togglePublished(r)} icon={r.published ? Eye : EyeOff} />
        <IconBtn label={`Edit ${r.title}`} onClick={() => openEditor(r)} icon={Pencil} />
        <IconBtn label={`Delete ${r.title}`} onClick={() => setConfirm(r.id)} icon={Trash2} danger />
      </div>
    )

  const navItem = ({ key, label, icon: Icon }) => (
    <button
      key={key}
      type="button"
      aria-current={tab === key ? 'page' : undefined}
      onClick={() => setTab(key)}
      className={cn(
        'flex h-10 w-full items-center gap-3 rounded-md px-3 text-[15px] font-semibold transition-colors duration-100 focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:outline-none',
        tab === key ? 'bg-ut-50 text-ut-800' : 'text-ut-700 hover:bg-ut-50 hover:text-ut-800',
      )}
    >
      <Icon className={cn('size-5', tab === key ? 'text-ut-700' : 'text-ut-500')} strokeWidth={1.9} aria-hidden="true" />
      {label}
      {counts[key] != null && <span className="ml-auto rounded-full border border-ut-200 bg-ut-50 px-2 py-0.5 text-xs font-medium text-ut-700 tabular-nums">{counts[key]}</span>}
    </button>
  )

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-svh bg-white text-ut-900 md:grid md:grid-cols-[280px_minmax(0,1fr)]">
        {/* desktop: Untitled UI's sidebar — brand, sections, the session card, the account */}
        <aside className="sticky top-0 hidden h-svh flex-col border-r border-ut-200 bg-white px-4 pt-8 pb-6 md:flex">
          <div className="px-2">
            <Brand />
          </div>
          <nav className="mt-6 grid gap-1" aria-label="Sections">
            {tabs.map(navItem)}
          </nav>

          <div className="mt-auto grid gap-6">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex h-10 items-center gap-3 rounded-md px-3 text-[15px] font-semibold text-ut-700 hover:bg-ut-50 hover:text-ut-800"
            >
              <ExternalLink className="size-5 text-ut-500" strokeWidth={1.9} aria-hidden="true" /> View site
            </a>
            <SessionCard left={timeLeft} total={SESSION_MINUTES * 60e3} />
            <div className="flex items-center gap-3 border-t border-ut-200 px-2 pt-6">
              <Avatar className="size-10 border border-ut-200">
                <AvatarFallback className="bg-ut-100 text-sm font-semibold text-ut-600">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-semibold text-ut-700">{session.login}</p>
                <p className="truncate text-ut-600">{session.repo}</p>
              </div>
              <IconBtn label="Sign out" onClick={onSignOut} icon={LogOut} />
            </div>
          </div>
        </aside>

        {/* phones: a slim bar with a menu, and the sections as underlined tabs */}
        <header className="sticky top-0 z-40 border-b border-ut-200 bg-white/95 backdrop-blur md:hidden">
          <div className="flex h-16 items-center justify-between gap-3 px-4">
            <Brand />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu" className="-mr-2">
                  <MoreVertical className="size-5" strokeWidth={1.9} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold text-ut-900">{session.login}</p>
                  <p className="mt-0.5 text-sm text-ut-600">
                    <SessionClock left={timeLeft} /> left in this session
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/" target="_blank" rel="noreferrer">
                    <ExternalLink /> View site
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onSignOut}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <nav className="flex gap-4 overflow-x-auto px-4" aria-label="Sections">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-current={tab === key ? 'page' : undefined}
                onClick={() => setTab(key)}
                className={cn(
                  'relative flex h-11 shrink-0 items-center gap-2 px-1 text-sm font-semibold transition-colors',
                  tab === key ? 'text-brand-700' : 'text-ut-500 hover:text-ut-700',
                )}
              >
                {label}
                {counts[key] != null && (
                  <span className={cn('rounded-full border px-2 py-px text-xs font-medium tabular-nums', tab === key ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-ut-200 bg-ut-50 text-ut-700')}>
                    {counts[key]}
                  </span>
                )}
                {tab === key && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-600" />}
              </button>
            ))}
          </nav>
        </header>

        <main className={cn('mx-auto w-full max-w-[1216px] min-w-0 px-4 pt-6 md:px-8 md:pt-8', dirty ? 'pb-32' : 'pb-16')}>
          {/* page header */}
          <div className="flex flex-col gap-4 border-b border-ut-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ut-900 md:text-[30px] md:leading-[38px]">{current.label}</h1>
              <p className="mt-1 text-base text-ut-600">
                {tab === 'visitors'
                  ? 'Who came by, from where, and what they did. Counted without cookies.'
                  : tab === 'seo'
                    ? 'How the site shows up in search results and in shared links. Changes stay here until you publish them.'
                    : `${counts[tab] ?? 0} in total. Changes stay here until you publish them.`}
              </p>
            </div>
            {k && (
              <Button onClick={() => openEditor(k.blank())} disabled={!draft} className="max-sm:w-full">
                <Plus className="size-5" strokeWidth={2} aria-hidden="true" /> Add {k.one}
              </Button>
            )}
          </div>

          <SessionWarning left={timeLeft} dirty={dirty} />
          {status && <Notice tone={status.tone} className="mt-6">{status.text}</Notice>}

          <div className="mt-6 md:mt-8">
            {tab === 'visitors' && <StatsPanel token={session.token} />}
            {/* keyed on the saved block, so a discard or a fresh load resets the form */}
            {tab === 'seo' && draft && <SeoPanel key={JSON.stringify(draft.seo ?? null)} seo={draft.seo} previewOf={previewOf} onSave={saveSeo} raised={dirty} />}

            {k && draft && rows.length === 0 && (
              <div className="flex flex-col items-center rounded-xl border border-ut-200 px-6 py-16 text-center shadow-xs">
                <FeaturedIcon icon={FolderOpen} className="size-12 [&_svg]:size-6" />
                <p className="mt-4 text-base font-semibold text-ut-900">No {k.label.toLowerCase()} yet</p>
                <p className="mt-1 text-sm text-ut-600">Add the first {k.one} and publish it when you’re ready.</p>
                <Button className="mt-6" onClick={() => openEditor(k.blank())}>
                  <Plus className="size-5" strokeWidth={2} aria-hidden="true" /> Add {k.one}
                </Button>
              </div>
            )}

            {k && rows.length > 0 && (
              <Card className="gap-0 overflow-hidden py-0">
                <div className="flex items-center gap-2 px-4 py-5 md:px-6">
                  <h2 className="text-lg font-semibold text-ut-900">All {k.label.toLowerCase()}</h2>
                  <Badge variant="default">{rows.length}</Badge>
                </div>

                {/* wide screens: Untitled UI's table */}
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-full xl:w-[46%]">{tab === 'projects' ? 'Project' : 'Certificate'}</TableHead>
                      <TableHead className="hidden xl:table-cell">{tab === 'projects' ? 'Role and tags' : 'Issuer and date'}</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={r.id}>
                        <TableCell className="max-w-0">
                          <div className="flex items-center gap-3">
                            {thumb(r, 'w-20')}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-ut-900">
                                {tab === 'projects' && <span className="mr-1.5 text-ut-500 tabular-nums">{String(i + 1).padStart(2, '0')}</span>}
                                {r.title}
                              </p>
                              <p className="truncate text-sm text-ut-600 xl:hidden">{k.meta(r) || '—'}</p>
                              <p className="hidden truncate text-sm text-ut-600 xl:block">{r.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden max-w-[260px] truncate text-sm xl:table-cell">{k.meta(r) || '—'}</TableCell>
                        <TableCell>
                          <Status published={r.published} />
                        </TableCell>
                        <TableCell className="text-right">{actions(r, i)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* phones: the same rows, stacked */}
                <ul className="divide-y divide-ut-200 border-t border-ut-200 md:hidden">
                  {rows.map((r, i) => (
                    <li key={r.id} className="px-4 py-4">
                      <div className="flex gap-3">
                        {thumb(r, 'w-24')}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium text-ut-900">{r.title}</p>
                          <p className="mt-0.5 truncate text-sm text-ut-600">{k.meta(r) || '—'}</p>
                          <div className="mt-2">
                            <Status published={r.published} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 -mr-2">{actions(r, i)}</div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {k && (
              <p className="mt-6 text-sm text-ut-600">
                Uploaded files go to <code className="rounded bg-ut-100 px-1.5 py-0.5 text-[13px] text-ut-700">{UPLOADS_DIR}/</code> in the repo. Every publish is a commit,
                so any change can be undone from GitHub’s history.
              </p>
            )}
          </div>
        </main>

        {/* unpublished changes: a floating bar that stays until you publish or discard */}
        <AnimatePresence>
          {dirty && (
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[640px] items-center justify-between gap-3 rounded-xl border border-ut-200 bg-white py-3 pr-3 pl-4 shadow-[0_12px_16px_-4px_rgb(16_24_40/0.08),0_4px_6px_-2px_rgb(16_24_40/0.03)] md:left-[280px]"
            >
              <p className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-ut-700">
                <span aria-hidden="true" className="relative flex size-2.5 shrink-0">
                  <span className="absolute inset-0 rounded-full bg-brand-500" />
                  <span className="absolute -inset-1 rounded-full bg-brand-500/20" />
                </span>
                <span className="truncate">
                  {log.length} <span className="max-sm:hidden">unpublished </span>change{log.length === 1 ? '' : 's'}
                </span>
              </p>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" onClick={discard} disabled={publishing} aria-label="Discard changes">
                  <RotateCcw strokeWidth={1.9} aria-hidden="true" /> <span className="max-sm:hidden">Discard</span>
                </Button>
                <Button onClick={publish} disabled={publishing}>
                  <UploadCloud strokeWidth={1.9} aria-hidden="true" /> {publishing ? 'Publishing…' : 'Publish'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeEditor()}>
          <SheetContent showCloseButton className="p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            {editing && (
              <Editor key={editKey} kind={tab} row={editing} taken={taken} previewOf={previewOf} onClose={closeEditor} onDone={onEdited} />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
