// Serves dist/ with the same headers and rewrites as vercel.json, to check the
// Content-Security-Policy before deploying. Run: npm run build && node tools/serve-dist.mjs
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const PORT = Number(process.env.PORT || 4321)
const root = path.resolve('dist')
const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.json': 'application/json',
}
// vercel.json source patterns → RegExp ("/admin/:path*", "/(.*)", "/admin(.*)")
const toRe = (src) => new RegExp(`^${src.replace(/:path\*/g, '.*').replace(/\//g, '\\/')}$`)

http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    for (const h of config.headers) if (toRe(h.source).test(url)) for (const { key, value } of h.headers) res.setHeader(key, value)
    let file = path.join(root, url)
    const rel = path.relative(root, file)
    if (rel.startsWith('..') || path.isAbsolute(rel)) return res.writeHead(403).end()
    const rewrite = config.rewrites.find((r) => toRe(r.source).test(url))
    if (rewrite) file = path.join(root, rewrite.destination)
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!fs.existsSync(file)) return res.writeHead(404).end('not found')
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
    fs.createReadStream(file).pipe(res)
  })
  .listen(PORT, '127.0.0.1', () => console.log(`dist with vercel.json headers on http://localhost:${PORT}`))
