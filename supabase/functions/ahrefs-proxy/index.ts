import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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

    const baseUrl = `https://api.ahrefs.com/v3/${endpoint}`
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

    const data = await ahrefsRes.json()

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
