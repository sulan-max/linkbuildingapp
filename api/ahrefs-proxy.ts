import type { VercelRequest, VercelResponse } from '@vercel/node'

const ALLOWED_ENDPOINTS = new Set([
  'site-explorer/organic-competitors',
  'site-explorer/metrics',
  'serp-overview',
  'batch-analysis',
  'subscription-info/limits-and-usage',
])

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { endpoint, method = 'GET', params, body, ahrefsKey } = req.body as {
    endpoint: string
    method?: string
    params?: Record<string, string>
    body?: unknown
    ahrefsKey: string
  }

  if (!ahrefsKey) {
    return res.status(400).json({ error: 'Chybí Ahrefs API klíč' })
  }

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return res.status(400).json({ error: 'Endpoint not allowed' })
  }

  const baseUrl = `https://api.ahrefs.com/v3/${endpoint}`

  try {
    let ahrefsRes: Response

    if (method === 'POST') {
      ahrefsRes = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ahrefsKey}`,
          'Content-Type': 'application/json',
        },
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
    try {
      data = JSON.parse(raw)
    } catch {
      data = { error: `Ahrefs ${ahrefsRes.status}: ${raw.slice(0, 300)}` }
    }

    return res.status(ahrefsRes.status).json(data)
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
