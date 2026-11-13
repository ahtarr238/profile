import { useState } from 'react'
import { AlertTriangle, Globe } from 'lucide-react'
import FilePick from './FilePick'
import { Field, Notice } from './ui'
import { friendly } from './errors'
import { imageToShareJpeg } from './media'
import { Button } from '@/admin/components/ui/button'
import { Label } from '@/admin/components/ui/label'
import { Switch } from '@/admin/components/ui/switch'
import { cn } from '@/admin/lib/utils'

const DOMAIN = 'ahtar.oceanspace.co.id'
// what Google and the link previews show before cutting off; past these the text still counts, it's just hidden
const LIMITS = { title: 60, description: 160, shareTitle: 70, shareDescription: 200 }

const lines = (t) =>
  String(t || '')
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean)
// a pasted <meta name="google-site-verification" content="…"> works as well as the code alone
const verificationCode = (t) => {
  const s = String(t || '').trim()
  const m = s.match(/content=["']([^"']+)["']/)
  return (m ? m[1] : s).trim()
}
const validCode = (s) => !s || /^[\w-]{10,100}$/.test(s)
const validLink = (s) => /^https:\/\/[^\s"'<>]+$/.test(s)

/** "52 / 60" under a field, orange once past what gets shown. */
function Count({ value, max }) {
  const n = String(value || '').length
  return <span className={cn('text-sm tabular-nums', n > max ? 'font-medium text-[#b54708]' : 'text-ut-500')}>{n} / {max}</span>
}

/** One row of Untitled UI's settings page: what it is on the left, the fields on the right. */
function Section({ title, text, children, aside }) {
  return (
    <section className="grid gap-5 border-t border-ut-200 py-6 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:gap-8">
      <div>
        <h2 className="text-sm font-semibold text-ut-700">{title}</h2>
        <p className="mt-1 text-sm text-ut-600">{text}</p>
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)] xl:items-start">
        <div className="grid min-w-0 gap-5">{children}</div>
        {aside}
      </div>
    </section>
  )
}

function GooglePreview({ name, title, description }) {
  return (
    <figure className="rounded-xl border border-ut-200 bg-white p-4 shadow-xs">
      <figcaption className="mb-3 text-xs font-medium text-ut-500">Google result, roughly</figcaption>
      <div className="flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-full border border-ut-200 bg-white">
          <img src="/favicon-48.png" alt="" className="size-[18px]" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm text-[#202124]">{name}</p>
          <p className="truncate text-xs text-[#4d5156]">https://{DOMAIN}</p>
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-[19px] leading-6 text-[#1a0dab]">{title || 'Page title'}</p>
      <p className="mt-1 line-clamp-2 text-sm leading-[22px] text-[#4d5156]">{description || 'The description goes here.'}</p>
    </figure>
  )
}

function SharePreview({ image, title, description }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-ut-200 bg-white shadow-xs">
      <figcaption className="px-4 pt-3 pb-2 text-xs font-medium text-ut-500">Shared link, roughly</figcaption>
      <div className="aspect-[1200/630] bg-ut-100">{image && <img src={image} alt="" className="size-full object-cover" />}</div>
      <div className="border-t border-ut-200 bg-ut-50 px-4 py-3">
        <p className="text-xs text-ut-500 uppercase">{DOMAIN}</p>
        <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-ut-900">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-ut-600">{description}</p>
      </div>
    </figure>
  )
}

/**
 * Search and link-preview settings. They live in cms.json's seo block; the next build writes
 * them into the page's <head> (tools/seo-head.mjs). Edits stay in this form until "Keep
 * changes", then wait in the draft for Publish like everything else.
 */
export default function SeoPanel({ seo = {}, previewOf, onSave, raised = false }) {
  const p0 = seo.person || {}
  const [v, setV] = useState(() => ({
    title: seo.title || '',
    description: seo.description || '',
    share_title: seo.share_title || '',
    share_description: seo.share_description || '',
    share_image: seo.share_image || '/og.jpg',
    share_image_alt: seo.share_image_alt || '',
    indexable: seo.indexable !== false,
    google_verification: seo.google_verification || '',
    bing_verification: seo.bing_verification || '',
    name: p0.name || '',
    alternate_name: p0.alternate_name || '',
    job_title: p0.job_title || '',
    person_description: p0.description || '',
    image: p0.image || '',
    email: p0.email || '',
    locality: p0.locality || '',
    region: p0.region || '',
    country: p0.country || '',
    school: p0.school || '',
    skills: (p0.skills || []).join(', '),
    links: (p0.links || []).join('\n'),
  }))
  const [file, setFile] = useState(null) // { blob, preview } for a new share image
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)

  const set = (key) => (e) => {
    setTouched(true)
    setV((o) => ({ ...o, [key]: e.target.value }))
  }

  const pickImage = async (f) => {
    setError('')
    setBusy('Cropping the picture to 1200 × 630…')
    try {
      const blob = await imageToShareJpeg(f)
      if (file) URL.revokeObjectURL(file.preview)
      setFile({ blob, preview: URL.createObjectURL(blob) })
      setTouched(true)
    } catch (e) {
      setError(friendly(e))
    }
    setBusy('')
  }

  const google = verificationCode(v.google_verification)
  const bing = verificationCode(v.bing_verification)
  const links = lines(v.links)
  const badLink = links.find((l) => !validLink(l))

  const save = (e) => {
    e.preventDefault()
    setError('')
    if (!v.title.trim()) return setError('Give the page a title.')
    if (!v.name.trim()) return setError('Add your name under “About you”.')
    if (badLink) return setError(`Links must start with https:// (check “${badLink}”).`)
    if (!validCode(google) || !validCode(bing)) return setError('A verification code looks wrong. Paste the code, or the whole <meta> tag.')
    if (v.country && !/^[A-Za-z]{2}$/.test(v.country.trim())) return setError('Country is a two-letter code, like ID.')
    const next = {
      title: v.title.trim(),
      description: v.description.trim(),
      share_title: v.share_title.trim(),
      share_description: v.share_description.trim(),
      share_image: v.share_image,
      share_image_alt: v.share_image_alt.trim(),
      indexable: v.indexable,
      google_verification: google,
      bing_verification: bing,
      person: {
        name: v.name.trim(),
        alternate_name: v.alternate_name.trim(),
        job_title: v.job_title.trim(),
        description: v.person_description.trim(),
        image: v.image,
        email: v.email.trim(),
        locality: v.locality.trim(),
        region: v.region.trim(),
        country: v.country.trim().toUpperCase(),
        school: v.school.trim(),
        skills: lines(v.skills).slice(0, 20),
        links: links.slice(0, 10),
      },
    }
    onSave(next, file)
    setFile(null)
    setTouched(false)
  }

  const shareImage = file?.preview || previewOf(v.share_image)

  return (
    <form onSubmit={save} className="grid">
      <Section
        title="Search result"
        text="The title and line under it in Google and Bing. Say who you are and what you do, in the words people would search for."
        aside={<GooglePreview name={v.name} title={v.title} description={v.description} />}
      >
        <div className="grid gap-1.5">
          <Field id="seo-title" label="Page title" value={v.title} onChange={set('title')} maxLength={120} />
          <Count value={v.title} max={LIMITS.title} />
        </div>
        <div className="grid gap-1.5">
          <Field id="seo-description" as="textarea" label="Description" value={v.description} onChange={set('description')} maxLength={320} />
          <Count value={v.description} max={LIMITS.description} />
        </div>
      </Section>

      <Section
        title="Link preview"
        text="The card WhatsApp, LinkedIn, X and Discord show when someone shares the site. Empty fields use the search ones."
        aside={<SharePreview image={shareImage} title={v.share_title || v.title} description={v.share_description || v.description} />}
      >
        <div className="grid gap-1.5">
          <Field id="seo-share-title" label="Title (optional)" placeholder={v.title} value={v.share_title} onChange={set('share_title')} maxLength={120} />
          <Count value={v.share_title || v.title} max={LIMITS.shareTitle} />
        </div>
        <div className="grid gap-1.5">
          <Field
            id="seo-share-description"
            as="textarea"
            label="Description (optional)"
            placeholder={v.description}
            value={v.share_description}
            onChange={set('share_description')}
            maxLength={320}
          />
          <Count value={v.share_description || v.description} max={LIMITS.shareDescription} />
        </div>
        <FilePick
          label="Picture"
          hint="JPG, PNG or WebP. It's cropped from the middle to 1200 × 630."
          accept="image/jpeg,image/png,image/webp"
          onPick={pickImage}
          preview={null}
        />
        <Field
          id="seo-share-alt"
          label="Picture description (optional)"
          hint="Read out by screen readers in the apps that support it."
          value={v.share_image_alt}
          onChange={set('share_image_alt')}
          maxLength={300}
        />
      </Section>

      <Section
        title="About you"
        text="Facts search engines read about the person behind the site (schema.org). They help Google connect your name, your work and your profiles."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="seo-name" label="Full name" value={v.name} onChange={set('name')} maxLength={80} />
          <Field id="seo-alt-name" label="Also known as" value={v.alternate_name} onChange={set('alternate_name')} maxLength={60} />
          <Field id="seo-job" label="Job title" value={v.job_title} onChange={set('job_title')} maxLength={80} />
          <Field id="seo-school" label="School or company" value={v.school} onChange={set('school')} maxLength={120} />
        </div>
        <Field id="seo-person-description" as="textarea" label="Short bio" value={v.person_description} onChange={set('person_description')} maxLength={320} />
        <div className="grid gap-5 sm:grid-cols-[1fr_1fr_96px]">
          <Field id="seo-city" label="City" value={v.locality} onChange={set('locality')} maxLength={60} />
          <Field id="seo-region" label="Province" value={v.region} onChange={set('region')} maxLength={60} />
          <Field id="seo-country" label="Country" value={v.country} onChange={set('country')} maxLength={2} placeholder="ID" />
        </div>
        <Field id="seo-email" label="Public email" type="email" value={v.email} onChange={set('email')} maxLength={120} />
        <Field id="seo-skills" label="Skills" hint="Comma separated, up to 20." value={v.skills} onChange={set('skills')} />
        <Field
          id="seo-links"
          as="textarea"
          label="Profiles"
          hint="One link per line: GitHub, LinkedIn, Instagram… Each must start with https://"
          value={v.links}
          onChange={set('links')}
          error={badLink ? `“${badLink}” must start with https://` : ''}
        />
      </Section>

      <Section title="Search engines" text="Whether search engines may list the site at all, and the codes that prove to them it's yours.">
        <div className="flex items-start gap-3 rounded-xl border border-ut-200 p-4">
          <Switch
            id="seo-indexable"
            checked={v.indexable}
            onCheckedChange={(on) => {
              setTouched(true)
              setV((o) => ({ ...o, indexable: on }))
            }}
            className="mt-0.5"
          />
          <div className="grid gap-0.5">
            <Label htmlFor="seo-indexable" className="text-ut-700">
              Show in search results
            </Label>
            <p className="text-sm text-ut-600">Off asks Google and Bing to drop the site, and robots.txt turns every crawler away.</p>
          </div>
        </div>
        {!v.indexable && (
          <div className="flex items-start gap-3 rounded-xl border border-[#fec84b] bg-[#fffcf5] p-4 text-sm text-[#b54708]">
            <AlertTriangle className="mt-px size-5 shrink-0 text-[#dc6803]" strokeWidth={1.9} aria-hidden="true" />
            <p>Once published, the site leaves Google within days and coming back takes a while. Only switch this off on purpose.</p>
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="seo-google"
            label="Google verification (optional)"
            hint="From Search Console → HTML tag. The code or the whole tag."
            value={v.google_verification}
            onChange={set('google_verification')}
            error={validCode(google) ? '' : 'That doesn’t look like a verification code'}
          />
          <Field
            id="seo-bing"
            label="Bing verification (optional)"
            hint="From Bing Webmaster Tools → Meta tag."
            value={v.bing_verification}
            onChange={set('bing_verification')}
            error={validCode(bing) ? '' : 'That doesn’t look like a verification code'}
          />
        </div>
        <p className="flex items-start gap-2 text-sm text-ut-600">
          <Globe className="mt-0.5 size-4 shrink-0 text-ut-500" strokeWidth={1.9} aria-hidden="true" />
          The Google file check (google…html) stays in place either way.
        </p>
      </Section>

      {/* stays in reach while scrolling; sits above the Publish bar once that one is up */}
      <div
        className={cn(
          'sticky z-10 mt-2 grid gap-3 rounded-xl border border-ut-200 bg-white p-4 shadow-[0_12px_16px_-4px_rgb(16_24_40/0.08),0_4px_6px_-2px_rgb(16_24_40/0.03)] sm:flex sm:items-center sm:justify-between',
          raised ? 'bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+76px)]' : 'bottom-3',
        )}
      >
        <div className="grid gap-2">
          {busy && <Notice>{busy}</Notice>}
          {error && <Notice tone="error">{error}</Notice>}
          {!busy && !error && (
            <p className="text-sm text-ut-600">{touched ? 'Unsaved edits on this page.' : 'Saved edits wait for Publish, like everything else.'}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-3">
          <Button type="submit" disabled={!!busy || !touched} className="max-sm:flex-1">
            Keep changes
          </Button>
        </div>
      </div>
    </form>
  )
}
