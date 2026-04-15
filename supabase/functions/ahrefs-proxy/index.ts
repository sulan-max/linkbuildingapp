import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { endpoint, method = 'GET', params, body, ahrefsKey } = await req.json()

    if (!ahrefsKey) {
      return new Response(JSON.stringify({ error: 'Chybí Ahrefs API klíč' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Allowlist of permitted Ahrefs endpoints
    const ALLOWED_ENDPOINTS = new Set([
      'site-explorer/organic-competitors',
      'site-explorer/metrics',
      'serp-overview',
      'batch-analysis',
      'subscription-info/limits-and-usage',
    ])
    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return new Response(JSON.stringify({ error: 'Endpoint not allowed' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const baseUrl = `https://api.ahrefs.com/v3/${endpoint}`
    let ahrefsRes: Response

    const timeout = AbortSignal.timeout(45000)

    if (method === 'POST') {
      ahrefsRes = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ahrefsKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: timeout,
      })
    } else {
      const qs = new URLSearchParams(params as Record<string, string>).toString()
      ahrefsRes = await fetch(`${baseUrl}?${qs}`, {
        headers: { 'Authorization': `Bearer ${ahrefsKey}` },
        signal: timeout,
      })
    }

    const raw = await ahrefsRes.text()
    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      data = { error: `Non-JSON response from Ahrefs: ${raw.slice(0, 200)}` }
    }

    return new Response(JSON.stringify(data), {
      status: ahrefsRes.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
