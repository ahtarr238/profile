import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, Award, ChartColumn, Clapperboard, ExternalLink, Eye, EyeOff, LogOut, Pencil, Plus, RotateCcw, Trash2, UploadCloud, X } from 'lucide-react'
import { GitHub, UPLOADS_DIR, uploadRepoPath } from './github'
import { checkVideo, imageToWebp, MAX_VIDEO_MB, pdfToWebp, videoPoster } from './media'
import { Brand, Btn, Field, Notice } from './ui'
import { friendly } from './errors'
import StatsPanel from './StatsPanel'
import { SessionClock, SessionWarning } from './SessionClock'
import { useTimeLeft } from './useTimeLeft'

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

function FilePick({ label, hint, accept, onPick, preview, kind = 'image' }) {
  return (
    <div>
      <span className="block text-[13px] text-mist">{label}</span>
      <div className="mt-1.5 flex flex-wrap items-center gap-4">
        {preview &&
          (kind === 'video' ? (
            <video src={preview} muted playsInline controls className="h-24 rounded-[4px] bg-tile" />
          ) : (
            <img src={preview} alt="" className="h-24 rounded-[4px] bg-white object-contain" />
          ))}
        <label className="inline-flex h-11 cursor-pointer items-center rounded-[4px] border border-sky-soft/30 px-4 text-[14px] text-sky-soft transition-colors duration-150 hover:border-sky-soft/70">
          {preview ? 'Replace file' : 'Choose file'}
          <input
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) onPick(f)
            }}
          />
        </label>
      </div>
      {hint && <span className="mt-1 block text-[12px] text-dim">{hint}</span>}
    </div>
  )
}

/** Add/edit form. Files are prepared here and handed back; nothing reaches GitHub until Publish. */
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
    <div className="fixed inset-0 z-50 flex justify-end bg-ground/80" role="dialog" aria-modal="true" aria-label={`${isNew ? 'Add' : 'Edit'} ${k.one}`}>
      <form onSubmit={save} className="flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-l border-sky-soft/15 bg-navy-deep p-6 md:p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[26px] tracking-[-0.02em]">
            {isNew ? 'Add' : 'Edit'} {k.one}
          </h2>
          <Btn kind="plain" onClick={onClose} aria-label="Close" className="px-2">
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </Btn>
        </div>

        <div className="mt-6 grid gap-5">
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
                hint="Drop the PDF straight from Dicoding or MySkill. The first page becomes the image."
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onPick={pickCertificate}
                preview={files.image?.preview || previewOf(v.image)}
              />
              <Field id="issuer" label="Issued by" value={v.issuer} onChange={set('issuer')} maxLength={160} placeholder="Dicoding Indonesia" />
              <Field id="issued_on" label="Date on the certificate" type="date" required value={v.issued_on} onChange={set('issued_on')} />
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
                hint="Shown before the video plays."
                accept="image/jpeg,image/png,image/webp"
                onPick={pickPoster}
                preview={files.poster?.preview || previewOf(v.poster)}
              />
              <Field id="description" as="textarea" label="Description" value={v.description} onChange={set('description')} maxLength={1200} />
              <Field id="tags" label="Tags" hint="Comma separated, up to 8." value={v.tagsText} onChange={set('tagsText')} />
              <Field id="role" label="Your role (optional)" hint="Shows as a badge, e.g. Contributor." value={v.role || ''} onChange={set('role')} maxLength={40} />

              {/* shown to visitors who switch the site to Bahasa Indonesia */}
              <fieldset className="grid gap-5 rounded-[6px] border border-sky-soft/15 p-4">
                <legend className="px-1 text-[13px] text-sky-soft">Bahasa Indonesia (optional)</legend>
                <p className="-mt-2 text-[12px] text-dim">Leave any of these empty and visitors reading in Indonesian see the English text instead.</p>
                <Field id="title_id" label="Judul" value={v.title_id || ''} onChange={set('title_id')} maxLength={160} />
                <Field id="description_id" as="textarea" label="Deskripsi" value={v.description_id || ''} onChange={set('description_id')} maxLength={1200} />
                <Field id="tags_id" label="Tag" hint="Pisahkan dengan koma, maksimal 8." value={v.tagsIdText} onChange={set('tagsIdText')} />
              </fieldset>
            </>
          )}

          <label className="flex items-center gap-3 text-[15px]">
            <input type="checkbox" checked={!!v.published} onChange={set('published')} className="size-4 accent-coral" />
            Show on the site
          </label>
        </div>

        <div className="mt-auto pt-8">
          {busy && <Notice>{busy}</Notice>}
          {error && <Notice tone="error">{error}</Notice>}
          <div className="mt-4 flex gap-3">
            <Btn type="submit" disabled={!!busy} className="flex-1">
              {isNew ? `Add ${k.one}` : 'Keep changes'}
            </Btn>
            <Btn kind="ghost" onClick={onClose} disabled={!!busy}>
              Cancel
            </Btn>
          </div>
          <p className="mt-3 text-[12px] text-dim">Nothing goes live until you press Publish.</p>
        </div>
      </form>
    </div>
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
  const [editing, setEditing] = useState(null)
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
    const list = draft?.[tab] || []
    return tab === 'certificates' ? [...list].sort((a, b) => b.issued_on.localeCompare(a.issued_on)) : list
  }, [draft, tab])
  const k = KINDS[tab]

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
    setEditing(null)
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
      setStatus({ tone: 'info', text: 'Published. The site updates in about a minute, once Vercel finishes the new build.' })
    } catch (e) {
      setStatus({ tone: 'error', text: friendly(e) })
    }
    setPublishing(false)
  }

  const taken = useMemo(() => new Set((draft?.[tab] || []).map((r) => r.id)), [draft, tab])
  const counts = { projects: draft?.projects?.length, certificates: draft?.certificates?.length }
  const tabs = [
    { key: 'visitors', label: 'Visitors', icon: ChartColumn },
    { key: 'projects', label: 'Projects', icon: Clapperboard },
    { key: 'certificates', label: 'Certificates', icon: Award },
  ]
  const current = tabs.find((x) => x.key === tab)

  return (
    <div className="min-h-svh bg-ground text-sky-soft md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      {/* desktop: a quiet sidebar with the sections and the account */}
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-sky-soft/10 bg-navy-deep/40 px-4 py-6 md:flex">
        <div className="px-2">
          <Brand />
        </div>
        <nav className="mt-10 grid gap-1" aria-label="Sections">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => setTab(key)}
              className={`flex h-11 items-center gap-3 rounded-[6px] px-3 text-[14px] transition-colors duration-150 ${
                tab === key ? 'bg-navy-raised text-sky-soft' : 'text-mist hover:bg-sky-soft/5 hover:text-sky-soft'
              }`}
            >
              <Icon size={17} strokeWidth={1.75} className={tab === key ? 'text-coral' : ''} aria-hidden="true" />
              {label}
              {counts[key] != null && <span className="ml-auto text-[12px] text-dim tabular-nums">{counts[key]}</span>}
            </button>
          ))}
        </nav>

        <div className="mt-auto grid gap-3 border-t border-sky-soft/10 px-2 pt-5 text-[13px]">
          <div className="min-w-0">
            <p className="truncate text-sky-soft">{session.login}</p>
            <p className="truncate text-[12px] text-dim">{session.repo}</p>
          </div>
          <p className="text-mist">
            <SessionClock left={timeLeft} /> <span className="text-dim">left</span>
          </p>
          <div className="-mx-2 grid gap-1">
            <a href="/" target="_blank" rel="noreferrer" className="flex h-10 items-center gap-2.5 rounded-[6px] px-2 text-mist hover:bg-sky-soft/5 hover:text-sky-soft">
              <ExternalLink size={15} strokeWidth={1.75} aria-hidden="true" /> View site
            </a>
            <button type="button" onClick={onSignOut} className="flex h-10 items-center gap-2.5 rounded-[6px] px-2 text-mist hover:bg-sky-soft/5 hover:text-coral">
              <LogOut size={15} strokeWidth={1.75} aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* phones: a slim bar on top and the three sections as a switch under it */}
      <header className="sticky top-0 z-40 border-b border-sky-soft/10 bg-ground px-4 pt-3 pb-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <div className="flex items-center gap-1 text-[13px] text-mist">
            <SessionClock left={timeLeft} />
            <a href="/" target="_blank" rel="noreferrer" aria-label="View site" className="grid size-10 place-items-center rounded-[6px] hover:text-sky-soft">
              <ExternalLink size={17} strokeWidth={1.75} aria-hidden="true" />
            </a>
            <button type="button" onClick={onSignOut} aria-label="Sign out" className="-mr-2 grid size-10 place-items-center rounded-[6px] hover:text-coral">
              <LogOut size={17} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>
        <nav className="mt-3 grid grid-cols-3 gap-1 rounded-[8px] bg-tile p-1" aria-label="Sections">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => setTab(key)}
              className={`flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-[6px] px-1 text-[13px] transition-colors duration-150 ${
                tab === key ? 'bg-navy-raised text-sky-soft' : 'text-mist'
              }`}
            >
              <Icon size={15} strokeWidth={1.75} className={`shrink-0 ${tab === key ? 'text-coral' : ''}`} aria-hidden="true" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className={`mx-auto w-full max-w-[1180px] min-w-0 px-4 pt-6 md:px-10 md:pt-10 ${dirty ? 'pb-32' : 'pb-16'}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[34px] leading-none tracking-[-0.03em] md:text-[44px]">{current.label}</h1>
            <p className="mt-2 text-[14px] text-mist">
              {tab === 'visitors'
                ? 'Who came by, from where, and what they did.'
                : `${counts[tab] ?? 0} in total. Changes stay here until you publish them.`}
            </p>
          </div>
          {k && (
            <Btn onClick={() => setEditing(k.blank())} disabled={!draft} className="max-sm:w-full">
              <Plus size={16} strokeWidth={2} aria-hidden="true" /> Add {k.one}
            </Btn>
          )}
        </div>

        <SessionWarning left={timeLeft} dirty={dirty} />
        {status && (
          <div className="mt-5">
            <Notice tone={status.tone}>{status.text}</Notice>
          </div>
        )}

        <div className="mt-6 md:mt-8">
          {tab === 'visitors' && <StatsPanel token={session.token} />}
          {k && draft && rows.length === 0 && (
            <p className="rounded-[10px] border border-dashed border-sky-soft/15 px-5 py-12 text-center text-mist">Nothing here yet. Add the first {k.one}.</p>
          )}
          {k && rows.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((r, i) => (
                <li key={r.id} className="flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-sky-soft/10 bg-tile">
                  <div className={`relative aspect-video ${tab === 'certificates' ? 'bg-white' : 'bg-navy-deep'}`}>
                    {k.thumb(r) && (
                      <img
                        src={previewOf(k.thumb(r))}
                        alt=""
                        loading="lazy"
                        className={`size-full ${tab === 'certificates' ? 'object-contain p-2' : 'object-cover'} ${r.published ? '' : 'opacity-40'}`}
                      />
                    )}
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      {tab === 'projects' && (
                        <span className="rounded-[4px] bg-ground/85 px-2 py-1 text-[12px] text-sky-soft tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      )}
                      {!r.published && <span className="rounded-[4px] bg-ground/85 px-2 py-1 text-[12px] text-mist">Hidden</span>}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <p className="line-clamp-2 text-[15px] leading-snug text-sky-soft">{r.title}</p>
                    <p className="mt-1 truncate text-[13px] text-dim">{k.meta(r) || '—'}</p>
                  </div>

                  <div className="flex h-12 items-center gap-0.5 border-t border-sky-soft/10 px-1.5">
                    {confirm === r.id ? (
                      <div className="flex w-full items-center justify-between gap-2 pl-2 text-[13px]">
                        <span className="truncate text-coral">Delete this {k.one}?</span>
                        <span className="flex shrink-0 gap-1">
                          <Btn kind="plain" className="h-9 px-3" onClick={() => setConfirm(null)}>
                            Keep
                          </Btn>
                          <Btn kind="danger" className="h-9 px-3" onClick={() => remove(r)}>
                            Delete
                          </Btn>
                        </span>
                      </div>
                    ) : (
                      <>
                        {tab === 'projects' && (
                          <>
                            <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)} icon={ArrowUp} />
                            <IconBtn label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} icon={ArrowDown} />
                          </>
                        )}
                        <span className="flex-1" />
                        <IconBtn label={r.published ? 'Hide from site' : 'Show on site'} onClick={() => togglePublished(r)} icon={r.published ? Eye : EyeOff} />
                        <IconBtn label={`Edit ${r.title}`} onClick={() => setEditing(r)} icon={Pencil} />
                        <IconBtn label={`Delete ${r.title}`} onClick={() => setConfirm(r.id)} icon={Trash2} danger />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {k && (
            <p className="mt-10 text-[12px] text-dim">
              Uploaded files go to <code>{UPLOADS_DIR}/</code> in the repo. Every publish is a commit, so any change can be undone from GitHub’s history.
            </p>
          )}
        </div>
      </main>

      {/* unpublished changes: a bar that rises from the bottom and stays until you publish or discard */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[640px] items-center justify-between gap-3 rounded-[10px] border border-coral/40 bg-navy-deep py-2 pr-2 pl-4 shadow-[0_18px_48px_rgb(0_0_0/0.5)] md:left-[264px]"
          >
            <p className="flex min-w-0 items-center gap-2.5 text-[14px]">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-coral" />
              <span className="truncate">
                {log.length} <span className="max-sm:hidden">unpublished </span>change{log.length === 1 ? '' : 's'}
              </span>
            </p>
            <div className="flex shrink-0 gap-1.5">
              <Btn kind="plain" onClick={discard} disabled={publishing} className="px-3" aria-label="Discard changes">
                <RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" /> <span className="max-sm:hidden">Discard</span>
              </Btn>
              <Btn onClick={publish} disabled={publishing}>
                <UploadCloud size={16} strokeWidth={1.75} aria-hidden="true" /> {publishing ? 'Publishing…' : 'Publish'}
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {editing && (
        <Editor kind={tab} row={editing} taken={taken} previewOf={previewOf} onClose={() => setEditing(null)} onDone={onEdited} />
      )}
    </div>
  )
}

function IconBtn({ label, icon: Icon, danger = false, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid size-10 place-items-center rounded-[6px] text-mist transition-colors duration-150 hover:bg-sky-soft/5 disabled:pointer-events-none disabled:opacity-30 ${
        danger ? 'hover:text-coral' : 'hover:text-sky-soft'
      }`}
      {...props}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}
