// Talks to GitHub with the signed-in admin's own token. GitHub itself decides what that token
// may do: the GitHub App can only touch this one repo, and only for an account with push access.

export const CMS_PATH = 'src/data/cms.json'
export const UPLOADS_DIR = 'public/uploads' // served by the site at /uploads/...

export class GitHub {
  constructor({ token, repo, branch }) {
    this.token = token
    this.repo = repo
    this.branch = branch
  }

  async api(path, init = {}) {
    const res = await fetch(`https://api.github.com/repos/${this.repo}${path}`, {
      ...init,
      cache: 'no-store', // GitHub answers are cacheable for 60s; a stale branch tip would block the next publish
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
    if (!res.ok) {
      const err = new Error((await res.json().catch(() => ({}))).message || `GitHub ${res.status}`)
      err.status = res.status
      throw err
    }
    return res.status === 204 ? null : res.json()
  }

  /** The current cms.json and the commit it came from. */
  async load() {
    const ref = await this.api(`/git/ref/heads/${encodeURIComponent(this.branch)}`)
    const head = ref.object.sha
    const file = await this.api(`/contents/${CMS_PATH}?ref=${head}`)
    const bytes = Uint8Array.from(atob(file.content.replace(/\n/g, '')), (ch) => ch.charCodeAt(0))
    return { head, cms: JSON.parse(new TextDecoder().decode(bytes)) }
  }

  /**
   * One commit with everything: the new cms.json, new uploads, removed uploads.
   * Fails (instead of overwriting) if the branch moved since `head` was loaded.
   */
  async commit({ head, cms, add = [], remove = [], message }) {
    const base = await this.api(`/git/commits/${head}`)
    const json = `${JSON.stringify(cms, null, 2)}\n`
    const entries = [{ path: CMS_PATH, mode: '100644', type: 'blob', content: json }]
    for (const f of add) {
      const blob = await this.api('/git/blobs', { method: 'POST', body: JSON.stringify({ content: await toBase64(f.blob), encoding: 'base64' }) })
      entries.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha })
    }
    for (const path of remove) entries.push({ path, mode: '100644', type: 'blob', sha: null })
    const tree = await this.api('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree: entries }) })
    const commit = await this.api('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [head] }) })
    await this.api(`/git/refs/heads/${encodeURIComponent(this.branch)}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha, force: false }),
    })
    return commit.sha
  }
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

/** Repo path of a site path we uploaded ourselves (/uploads/...), or null for built-in files. */
export function uploadRepoPath(sitePath) {
  return /^\/uploads\/[\w./-]+$/.test(sitePath || '') && !sitePath.includes('..') ? `public${sitePath}` : null
}
