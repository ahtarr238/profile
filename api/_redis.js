// Minimal Upstash Redis client over its REST API (no SDK). The connection is created from
// Vercel → Storage → Upstash Redis, which adds these variables to the project by itself.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

export const redisReady = Boolean(URL_ && TOKEN)
export const redisSecret = TOKEN || '' // also used to key the daily visitor hash, so it never leaves the server

/** Runs several commands in one round trip; returns their results in order. */
export async function pipeline(commands) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  })
  if (!res.ok) throw new Error(`redis ${res.status}`)
  const out = await res.json()
  return out.map((r) => r.result)
}
