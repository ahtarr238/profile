import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, LogOut, Pencil, Plus, RotateCcw, Trash2, UploadCloud, X } from 'lucide-react'
import { GitHub, UPLOADS_DIR, uploadRepoPath } from './github'
import { checkVideo, imageToWebp, MAX_VIDEO_MB, pdfToWebp, videoPoster } from './media'
import { Brand, Btn, Field, Notice, Shell } from './ui'
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
const httpsOnly = (v) => !v || /^https:\/\/[^\s"'<>]+$/.test(v)

const KINDS = {
  projects: {
    label: 'Projects',
    one: 'project',
    thumb: (r) => r.poster,
    meta: (r) => [r.role, (r.tags || []).join(' · ')].filter(Boolean).join(' — '),
    blank: () => ({ id: '', title: '', description: '', tags: [], role: '', video: '', poster: '', published: true }),
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
  const [v, setV] = useState(() => ({ ...row, tagsText: (row.tags || []).join(', ') }))
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
            tags: v.tagsText
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 8),
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

  return (
    <Shell wide>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Brand />
        <div className="flex items-center gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 px-3 text-[14px] text-mist hover:text-sky-soft">
            View site <ExternalLink size={15} strokeWidth={1.75} aria-hidden="true" />
          </a>
          <Btn kind="ghost" onClick={onSignOut}>
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" /> Sign out
          </Btn>
        </div>
      </header>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[13px] text-dim">
        Signed in as {session.login} · saves to {session.repo} · <SessionClock left={timeLeft} />
      </p>
      <SessionWarning left={timeLeft} dirty={dirty} />

      {/* unsaved changes bar */}
      <div
        className={`sticky top-0 z-40 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[6px] px-4 py-3 ${
          dirty ? 'bg-coral/15' : 'bg-tile'
        }`}
      >
        <p className="text-[14px]">{dirty ? `${log.length} unpublished change${log.length === 1 ? '' : 's'}` : 'Everything is published.'}</p>
        <div className="flex gap-2">
          {dirty && (
            <Btn kind="plain" onClick={discard} disabled={publishing}>
              <RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" /> Discard
            </Btn>
          )}
          <Btn onClick={publish} disabled={!dirty || publishing}>
            <UploadCloud size={16} strokeWidth={1.75} aria-hidden="true" /> {publishing ? 'Publishing…' : 'Publish'}
          </Btn>
        </div>
      </div>
      {status && (
        <div className="mt-3">
          <Notice tone={status.tone}>{status.text}</Notice>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-sky-soft/15">
        <div className="flex gap-6" role="tablist">
          {[['visitors', 'Visitors'], ...Object.entries(KINDS).map(([key, kind]) => [key, kind.label])].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 pb-3 font-display text-[22px] transition-colors duration-150 md:text-[28px] ${
                tab === key ? 'border-coral text-sky-soft' : 'border-transparent text-dim hover:text-mist'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {k && (
          <Btn onClick={() => setEditing(k.blank())} className="mb-3" disabled={!draft}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" /> Add {k.one}
          </Btn>
        )}
      </div>

      {tab === 'visitors' && <StatsPanel token={session.token} />}
      {k && draft && rows.length === 0 && <p className="mt-8 text-mist">Nothing here yet. Add the first {k.one}.</p>}
      <ul className="mt-2 divide-y divide-sky-soft/10">
        {rows.map((r, i) => (
          <li key={r.id} className="flex flex-wrap items-center gap-4 py-4">
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-[4px] bg-tile">
              {k.thumb(r) && <img src={previewOf(k.thumb(r))} alt="" className="size-full object-cover" loading="lazy" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-[16px]">
                {r.title}
                {!r.published && <span className="rounded-[3px] bg-sky-soft/10 px-1.5 py-0.5 text-[11px] text-mist">Hidden</span>}
              </p>
              <p className="truncate text-[13px] text-dim">{k.meta(r)}</p>
            </div>
            <div className="flex items-center gap-1">
              {tab === 'projects' && (
                <>
                  <Btn kind="plain" className="px-2" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp size={16} strokeWidth={1.75} aria-hidden="true" />
                  </Btn>
                  <Btn kind="plain" className="px-2" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown size={16} strokeWidth={1.75} aria-hidden="true" />
                  </Btn>
                </>
              )}
              <Btn kind="plain" className="px-2" aria-label={r.published ? 'Hide from site' : 'Show on site'} onClick={() => togglePublished(r)}>
                {r.published ? <Eye size={16} strokeWidth={1.75} aria-hidden="true" /> : <EyeOff size={16} strokeWidth={1.75} aria-hidden="true" />}
              </Btn>
              <Btn kind="plain" className="px-2" aria-label={`Edit ${r.title}`} onClick={() => setEditing(r)}>
                <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
              </Btn>
              {confirm === r.id ? (
                <span className="flex items-center gap-2 pl-2 text-[13px]">
                  Delete?
                  <Btn kind="danger" className="h-9 px-3" onClick={() => remove(r)}>
                    Yes
                  </Btn>
                  <Btn kind="plain" className="h-9 px-2" onClick={() => setConfirm(null)}>
                    No
                  </Btn>
                </span>
              ) : (
                <Btn kind="plain" className="px-2 hover:text-coral" aria-label={`Delete ${r.title}`} onClick={() => setConfirm(r.id)}>
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                </Btn>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-[12px] text-dim">
        Uploaded files go to <code>{UPLOADS_DIR}/</code> in the repo. Every publish is a commit, so any change can be undone from GitHub’s history.
      </p>

      {editing && (
        <Editor kind={tab} row={editing} taken={taken} previewOf={previewOf} onClose={() => setEditing(null)} onDone={onEdited} />
      )}
    </Shell>
  )
}
