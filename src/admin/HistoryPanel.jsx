import { useEffect, useState } from 'react'
import { ExternalLink, History, RotateCcw } from 'lucide-react'
import { friendly } from './errors'
import { FeaturedIcon, Notice } from './ui'
import { Avatar, AvatarFallback } from '@/admin/components/ui/avatar'
import { Badge } from '@/admin/components/ui/badge'
import { Button } from '@/admin/components/ui/button'
import { Card } from '@/admin/components/ui/card'
import { Skeleton } from '@/admin/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/admin/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/admin/components/ui/tooltip'
import { cn } from '@/admin/lib/utils'

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const STEPS = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [7, 'day'],
  [4.35, 'week'],
  [12, 'month'],
  [Infinity, 'year'],
]
function ago(iso) {
  let v = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [size, unit] of STEPS) {
    if (Math.abs(v) < size) return rtf.format(Math.round(v), unit)
    v /= size
  }
  return ''
}
const full = (iso) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

/** "Admin: 2 changes\n\n- Edit project …\n- Hide …" → a title, the list, and whether /admin made it. */
function parse(message) {
  const [first, ...rest] = message.split('\n')
  const fromAdmin = first.startsWith('Admin: ')
  const items = rest.map((l) => l.trim()).filter((l) => l.startsWith('- ')).map((l) => l.slice(2))
  return { title: fromAdmin ? first.slice(7) : first, items, fromAdmin }
}

function Change({ c }) {
  const { title, items, fromAdmin } = parse(c.message)
  const shown = items.length > 1 ? items.slice(0, 3) : []
  return (
    <div className="min-w-0">
      <p className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-ut-900">{title}</span>
        <Badge variant={fromAdmin ? 'default' : 'secondary'} className="shrink-0">
          {fromAdmin ? 'Admin' : 'Code'}
        </Badge>
      </p>
      {shown.length > 0 && (
        <ul className="mt-1 grid gap-0.5 text-sm text-ut-600">
          {shown.map((t, i) => (
            <li key={i} className="truncate">
              {t}
            </li>
          ))}
          {items.length > shown.length && <li className="text-ut-500">and {items.length - shown.length} more</li>}
        </ul>
      )}
    </div>
  )
}

/**
 * Every change to the site's content, newest first, read from GitHub. "Restore" loads the content
 * as it was right after that change into the draft (with any uploads deleted since), so it can
 * be checked in Projects and Certificates and then published like any other edit.
 */
export default function HistoryPanel({ gh, head, dirty, onRestore }) {
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [asking, setAsking] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    let on = true
    gh.history(20)
      .then((l) => on && (setList(l), setError('')))
      .catch((e) => on && setError(friendly(e)))
    return () => {
      on = false
    }
  }, [gh, head])

  const restore = async (c) => {
    setBusy(c.sha)
    await onRestore(c, parse(c.message).title)
    setBusy(null)
    setAsking(null)
  }

  if (error) return <Notice tone="error">{error}</Notice>
  if (!list)
    return (
      <div className="grid gap-3" aria-busy="true" aria-label="Loading history">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[72px] rounded-xl bg-ut-100" />
        ))}
      </div>
    )
  if (list.length === 0)
    return (
      <div className="flex flex-col items-center rounded-xl border border-ut-200 px-6 py-16 text-center shadow-xs">
        <FeaturedIcon icon={History} className="size-12 [&_svg]:size-6" />
        <p className="mt-4 text-base font-semibold text-ut-900">Nothing published yet</p>
      </div>
    )

  const actions = (c, i) => {
    if (i === 0)
      return (
        <Badge variant="success">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[#17b26a]" />
          Live now
        </Badge>
      )
    if (asking === c.sha)
      return (
        <div className="flex items-center justify-end gap-2">
          <span className="mr-1 text-sm font-medium text-ut-700">Load this version?</span>
          <Button variant="outline" size="sm" onClick={() => setAsking(null)} disabled={busy === c.sha}>
            Keep
          </Button>
          <Button size="sm" onClick={() => restore(c)} disabled={busy === c.sha}>
            {busy === c.sha ? 'Loading…' : 'Load'}
          </Button>
        </div>
      )
    return (
      <div className="flex items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" asChild className="text-ut-500">
              <a href={c.url} target="_blank" rel="noreferrer" aria-label="See this change on GitHub">
                <ExternalLink strokeWidth={1.9} aria-hidden="true" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>See it on GitHub</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* a span, so the tooltip still explains a disabled button */}
            <span tabIndex={dirty ? 0 : -1}>
              <Button variant="outline" size="sm" onClick={() => setAsking(c.sha)} disabled={dirty} className={cn(dirty && 'pointer-events-none')}>
                <RotateCcw strokeWidth={1.9} aria-hidden="true" /> Restore
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{dirty ? 'Publish or discard your changes first' : 'Load the content as it was right after this change'}</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  const who = (c) => (
    <span className="flex items-center gap-2.5">
      <Avatar className="size-7 border border-ut-200">
        <AvatarFallback className="bg-ut-100 text-[11px] font-semibold text-ut-600">{c.author.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="truncate text-sm text-ut-700">{c.author}</span>
    </span>
  )

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ut-600">
        The last {list.length} changes to projects, certificates and SEO. Restoring loads an older version as a draft: nothing goes live until you publish it, and
        the restore itself shows up here too, so it can be undone the same way.
      </p>
      <Card className="gap-0 overflow-hidden py-0">
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Change</TableHead>
              <TableHead>By</TableHead>
              <TableHead>When</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c, i) => (
              <TableRow key={c.sha}>
                <TableCell className="h-auto max-w-0 py-4">
                  <Change c={c} />
                </TableCell>
                <TableCell className="h-auto py-4">{who(c)}</TableCell>
                <TableCell className="h-auto py-4 text-sm" title={full(c.date)}>
                  {ago(c.date)}
                </TableCell>
                <TableCell className="h-auto py-4 text-right">{actions(c, i)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <ul className="divide-y divide-ut-200 md:hidden">
          {list.map((c, i) => (
            <li key={c.sha} className="grid gap-3 px-4 py-4">
              <Change c={c} />
              <div className="flex items-center justify-between gap-3 text-sm text-ut-600">
                {who(c)}
                <span className="shrink-0" title={full(c.date)}>
                  {ago(c.date)}
                </span>
              </div>
              <div className="flex justify-end">{actions(c, i)}</div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
