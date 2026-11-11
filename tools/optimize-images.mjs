// Re-encodes the heavy site images as WebP at a sensible width, using the machine's Chrome
// (canvas encoder over the DevTools protocol); nothing to install.
//   node tools/optimize-images.mjs
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const IMAGES = path.join(ROOT, 'public', 'images')
// source file -> [output name, max width]
const JOBS = [
  ['CertiDicoding_DasarWeb-1.png', 'cert-dicoding-web.webp', 1600],
  ['react-certi.png', 'cert-myskill-react.webp', 1600],
  ['flutter-certi.png', 'cert-myskill-flutter.webp', 1600],
  ['Ahtar-PP.jpeg', 'ahtar.webp', 640],
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const server = http.createServer((req, res) => {
  const f = path.join(IMAGES, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (!f.startsWith(IMAGES) || !fs.existsSync(f)) {
    res.writeHead(404)
    return res.end()
  }
  // the page itself: an empty document the encoder script runs in
  if (fs.statSync(f).isDirectory()) {
    res.writeHead(200, { 'content-type': 'text/html' })
    return res.end('<!doctype html><title>encode</title>')
  }
  res.writeHead(200, { 'access-control-allow-origin': '*' })
  fs.createReadStream(f).pipe(res)
})
await new Promise((r) => server.listen(5395, '127.0.0.1', r))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'img-opt-'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9339', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
let targets
for (let i = 0; i < 80; i++) {
  try {
    targets = await (await fetch('http://127.0.0.1:9339/json/list')).json()
    if (targets.find((t) => t.type === 'page')) break
  } catch {}
  await sleep(250)
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const pending = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result)
    pending.delete(m.id)
  }
})
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id
    pending.set(i, res)
    ws.send(JSON.stringify({ id: i, method, params }))
  })

try {
  await send('Page.navigate', { url: 'http://127.0.0.1:5395/' })
  await sleep(500)
  for (const [src, out, maxW] of JOBS) {
    const expr = `(async () => {
      const img = new Image(); img.crossOrigin = 'anonymous'; img.src = 'http://127.0.0.1:5395/${src}';
      await img.decode();
      const w = Math.min(${maxW}, img.naturalWidth), h = Math.round(img.naturalHeight * w / img.naturalWidth);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, w, h);
      return c.toDataURL('image/webp', 0.82);
    })()`
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    const data = r.result.value
    fs.writeFileSync(path.join(IMAGES, out), Buffer.from(data.split(',')[1], 'base64'))
    const before = fs.statSync(path.join(IMAGES, src)).size
    const after = fs.statSync(path.join(IMAGES, out)).size
    console.log(`${src} ${(before / 1024).toFixed(0)} KB -> ${out} ${(after / 1024).toFixed(0)} KB`)
  }
} finally {
  ws.close()
  chrome.kill()
  server.close()
}
