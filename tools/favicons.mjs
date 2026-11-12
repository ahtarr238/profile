// Draws public/favicon.svg at the sizes search engines and phones ask for, using the machine's
// Chrome over the DevTools protocol (nothing to install):
//   public/favicon-48.png, favicon-96.png, favicon-192.png  (Google wants a multiple of 48px)
//   public/favicon.ico                                      (16, 32 and 48px, PNG inside)
//   node tools/favicons.mjs
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public')
const svg = fs.readFileSync(path.join(PUBLIC, 'favicon.svg'), 'utf8')
const PNGS = [48, 96, 192]
const ICO = [16, 32, 48]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'favicons-'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9343', `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' })
let targets
for (let i = 0; i < 80; i++) {
  try {
    targets = await (await fetch('http://127.0.0.1:9343/json/list')).json()
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
  if (!m.id || !pending.has(m.id)) return
  const p = pending.get(m.id)
  pending.delete(m.id)
  m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result)
})
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })) })
const evalJS = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400))
  return r.result.value
}

// draws the SVG onto a size×size canvas and returns PNG bytes as base64
const render = (size) => `(async () => {
  const img = new Image()
  img.src = 'data:image/svg+xml;base64,' + ${JSON.stringify(Buffer.from(svg).toString('base64'))}
  await img.decode()
  const c = document.createElement('canvas')
  c.width = c.height = ${size}
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, ${size}, ${size})
  return c.toDataURL('image/png').split(',')[1]
})()`

try {
  await send('Runtime.enable')
  const png = {}
  for (const size of new Set([...PNGS, ...ICO])) png[size] = Buffer.from(await evalJS(render(size)), 'base64')
  for (const size of PNGS) {
    fs.writeFileSync(path.join(PUBLIC, `favicon-${size}.png`), png[size])
    console.log(`favicon-${size}.png`, png[size].length, 'bytes')
  }
  // .ico: a 6-byte header, a 16-byte entry per image, then the PNGs themselves
  const head = Buffer.alloc(6)
  head.writeUInt16LE(0, 0)
  head.writeUInt16LE(1, 2) // icon
  head.writeUInt16LE(ICO.length, 4)
  let offset = 6 + 16 * ICO.length
  const entries = ICO.map((size) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(size % 256, 0)
    e.writeUInt8(size % 256, 1)
    e.writeUInt16LE(1, 4) // colour planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(png[size].length, 8)
    e.writeUInt32LE(offset, 12)
    offset += png[size].length
    return e
  })
  const ico = Buffer.concat([head, ...entries, ...ICO.map((s) => png[s])])
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), ico)
  console.log('favicon.ico', ico.length, 'bytes')
} finally {
  try { ws.close() } catch {}
  chrome.kill()
}
