// Writes the hero's parallax layers from layers.html into public/hero-layers/*.webp.
//   node tools/hero-layers/generate.mjs           (layers)
//   node tools/hero-layers/generate.mjs preview   (also saves a flattened preview.jpg here)
// Uses the machine's Chrome over the DevTools protocol (Node's built-in WebSocket); nothing to install.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(HERE, '../../public/hero-layers')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const server = http.createServer((req, res) => {
  const f = path.join(HERE, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (!f.startsWith(HERE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404)
    return res.end()
  }
  res.writeHead(200, { 'content-type': 'text/html' })
  fs.createReadStream(f).pipe(res)
})
await new Promise((r) => server.listen(5394, '127.0.0.1', r))

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hero-layers-'))
const chrome = spawn(
  CHROME,
  ['--headless=new', '--remote-debugging-port=9336', `--user-data-dir=${profile}`, '--no-first-run', '--window-size=1600,1067', 'about:blank'],
  { stdio: 'ignore' },
)

let targets
for (let i = 0; i < 80; i++) {
  try {
    targets = await (await fetch('http://127.0.0.1:9336/json/list')).json()
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
  if (m.error) p.rej(new Error(JSON.stringify(m.error)))
  else p.res(m.result)
})
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id
    pending.set(i, { res, rej })
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const evalJS = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400))
  return r.result.value
}

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: 'http://127.0.0.1:5394/layers.html' })
  for (let i = 0; i < 80; i++) {
    try {
      if (await evalJS('typeof window.exportLayers === "function"')) break
    } catch {}
    await sleep(100)
  }
  const layers = await evalJS('window.exportLayers()')
  fs.mkdirSync(OUT, { recursive: true })
  for (const [name, url] of Object.entries(layers)) {
    const file = path.join(OUT, `${name}.webp`)
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'))
    console.log(name, `${(fs.statSync(file).size / 1024).toFixed(0)} KB`)
  }
  if (process.argv[2] === 'preview') {
    const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
    fs.writeFileSync(path.join(HERE, 'preview.jpg'), Buffer.from(r.data, 'base64'))
    console.log('preview.jpg')
  }
} finally {
  try {
    ws.close()
  } catch {}
  chrome.kill()
  server.close()
}
