import type { IncomingMessage, ServerResponse } from 'node:http'

const ALLOWED = new Set([
  'site-explorer/organic-competitors',
  'site-explorer/metrics',
  'serp-overview',
  'batch-analysis',
  'subscription-info/limits-and-usage',
])

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch { reject(new Error('Invalid JSON body')) }
    })
    req.on('error', reject)
  })
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  }

  let payload: Record<string, unknown>
  try {
    payload = await readBody(req) as Record<string, unknown>
  } catch {
    return send(400, { error: 'Invalid request body' })
  }

  const { endpoint, method = 'GET', params, body, ahrefsKey } = payload as {
    endpoint: string
    method?: string
    params?: Record<string, string>
    body?: unknown
    ahrefsKey: string
  }

  if (!ahrefsKey) return send(400, { error: 'Chybí Ahrefs API klíč' })
  if (!ALLOWED.has(endpoint)) return send(400, { error: 'Endpoint not allowed' })

  const baseUrl = `https://api.ahrefs.com/v3/${endpoint}`

  try {
    let ahrefsRes: Response

    if (method === 'POST') {
      ahrefsRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${ahrefsKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      const qs = new URLSearchParams(params as Record<string, string>).toString()
      ahrefsRes = await fetch(`${baseUrl}?${qs}`, {
        headers: { 'Authorization': `Bearer ${ahrefsKey}` },
      })
    }

    const raw = await ahrefsRes.text()
    let data: unknown
    try { data = JSON.parse(raw) } catch { data = { error: `Ahrefs ${ahrefsRes.status}: ${raw.slice(0, 300)}` } }

    send(ahrefsRes.status, data)
  } catch (err) {
    send(500, { error: String(err) })
  }
}
