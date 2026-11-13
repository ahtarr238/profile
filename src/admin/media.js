// Turns whatever gets dropped in (a certificate PDF, a phone photo, a screen recording)
// into a light file for the site.
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// every upload becomes part of the repo for good, so videos stay small
export const MAX_VIDEO_MB = 25
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/webm']

const canvasToWebp = (canvas, quality = 0.84) =>
  new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the image'))), 'image/webp', quality),
  )

function fit(w, h, maxW) {
  const scale = Math.min(1, maxW / w)
  return [Math.round(w * scale), Math.round(h * scale)]
}

/** First page of a PDF, drawn at up to `maxW` pixels wide, as WebP. */
export async function pdfToWebp(file, maxW = 1600) {
  if (file.type !== 'application/pdf') throw new Error('That file is not a PDF')
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() })
  const pdf = await task.promise
  try {
    const page = await pdf.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: maxW / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    await page.render({ canvas, viewport }).promise
    return canvasToWebp(canvas)
  } finally {
    task.destroy() // frees the worker's copy of the PDF
  }
}

/** Any photo or screenshot, shrunk to `maxW` wide, as WebP. */
export async function imageToWebp(file, maxW = 1600) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Use a JPG, PNG or WebP image')
  const bitmap = await createImageBitmap(file)
  const [w, h] = fit(bitmap.width, bitmap.height, maxW)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return canvasToWebp(canvas)
}

/**
 * The link-preview picture (WhatsApp, LinkedIn, X…): cropped from the middle to exactly
 * 1200×630, the size every one of them shows in full, as JPEG, which all of them read.
 */
export async function imageToShareJpeg(file) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Use a JPG, PNG or WebP image')
  const bitmap = await createImageBitmap(file)
  const W = 1200
  const H = 630
  const scale = Math.max(W / bitmap.width, H / bitmap.height) // cover: fill the frame, trim the overflow
  const w = bitmap.width * scale
  const h = bitmap.height * scale
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, (W - w) / 2, (H - h) / 2, w, h)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the image'))), 'image/jpeg', 0.86),
  )
}

/** A still from about a second into the video, used as its poster. */
export function videoPoster(file, maxW = 1280) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const src = URL.createObjectURL(file)
    const done = (fn, v) => {
      URL.revokeObjectURL(src)
      fn(v)
    }
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = src
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 2)
    }
    video.onseeked = async () => {
      try {
        const [w, h] = fit(video.videoWidth, video.videoHeight, maxW)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(video, 0, 0, w, h)
        done(resolve, await canvasToWebp(canvas, 0.8))
      } catch (e) {
        done(reject, e)
      }
    }
    video.onerror = () => done(reject, new Error('This video could not be read. Try an MP4.'))
  })
}

export function checkVideo(file) {
  if (!VIDEO_TYPES.includes(file.type)) throw new Error('Use an MP4 or WebM video')
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`Videos can be up to ${MAX_VIDEO_MB} MB`)
}
