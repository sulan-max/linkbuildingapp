import { useState, useCallback } from 'react'
import { getGeminiKey, getAhrefsKey } from '../lib/settings'
import { getSourceMetrics } from '../lib/ahrefs'

export interface AnalyzaResult {
  hodnoceni: string
  skore: number
  summary: string
  analyza: {
    autorita: string
    relevance: string
    anchor_text: string
    typ_odkazu: string
    traffic: string
    rizika: string
  }
  doporuceni: string
}

export type AnalyzaStatus = 'idle' | 'loading-metrics' | 'loading-ai' | 'done' | 'error'

function buildPrompt(
  urlFrom: string,
  domainRating: number | null,
  traffic: number | null
): string {
  return `Jsi expert na SEO a linkbuilding. Analyzuj kvalitu zpětného odkazu a vrať strukturované hodnocení.

VSTUPNÍ DATA:
- URL zdroje (stránka, kde odkaz je): ${urlFrom}
- Domain Rating zdroje: ${domainRating !== null ? domainRating : 'N/A'}
- Organický měsíční traffic zdroje: ${traffic !== null ? traffic.toLocaleString('cs') + ' návštěv/měsíc' : 'N/A'}
- Anchor text: N/A (neznámý)
- Typ odkazu: neznámý (dofollow/nofollow)
- URL cíle: N/A

INSTRUKCE:
Analyzuj odkaz z pohledu SEO hodnoty. Zvaž:
1. Autoritu zdroje (DR, stáří domény, typ webu)
2. Relevanci obsahu stránky pro typický český/slovenský e-commerce nebo firemní web
3. Traffic potenciál (reálná pravděpodobnost přístupu uživatelů)
4. Rizika (PBN, link farm, nízká kvalita, penalizace)

Vrať POUZE JSON (žádné markdown bloky, žádné backticky):
{
  "hodnoceni": "Výborný|Dobrý|Průměrný|Slabý",
  "skore": číslo 0–100,
  "summary": "2–3 věty souhrnného hodnocení odkazu pro SEO specialistu",
  "analyza": {
    "autorita": "Hodnocení autority zdrojové domény a co to znamená pro přenos link juice (2–3 věty)",
    "relevance": "Jak relevantní je zdrojová stránka pro typický linkbuilding projekt (2–3 věty)",
    "anchor_text": "Komentář k anchor textu — jelikož je neznámý, doporuč nejlepší typ anchoru pro tento zdroj (2–3 věty)",
    "typ_odkazu": "Hodnocení dofollow vs nofollow a co to znamená (2–3 věty)",
    "traffic": "Analýza traffic potenciálu a reálné referral návštěvnosti (2–3 věty)",
    "rizika": "Identifikovaná SEO rizika nebo pozitivní signály čistoty odkazu (2–3 věty)"
  },
  "doporuceni": "Konkrétní doporučení co dělat s tímto odkazem (1–2 věty)"
}`
}

async function callGemini(prompt: string, key: string): Promise<AnalyzaResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(`Gemini ${res.status}: ${errBody?.error?.message ?? res.statusText}`)
  }
  const json = await res.json()
  const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Prázdná odpověď od Gemini')
  return JSON.parse(text) as AnalyzaResult
}

export function useBacklinkAnalysis() {
  const [status, setStatus] = useState<AnalyzaStatus>('idle')
  const [result, setResult] = useState<AnalyzaResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async (url: string, drFromSheet: number | null) => {
    setStatus('loading-metrics')
    setResult(null)
    setError(null)

    const geminiKey = getGeminiKey()
    const ahrefsKey = getAhrefsKey()

    if (!geminiKey) {
      setError('Chybí Gemini API klíč — nastav ho v Nastavení.')
      setStatus('error')
      return
    }

    let traffic: number | null = null
    let domainRating: number | null = drFromSheet

    // Try to get fresh metrics from Ahrefs if key available
    if (ahrefsKey) {
      try {
        const metrics = await getSourceMetrics(url, ahrefsKey)
        traffic = metrics.org_traffic
        if (metrics.domain_rating !== null) domainRating = metrics.domain_rating
      } catch {
        // Non-fatal — continue without traffic data
      }
    }

    setStatus('loading-ai')
    try {
      const prompt = buildPrompt(url, domainRating, traffic)
      const data = await callGemini(prompt, geminiKey)
      // Clamp score just in case
      data.skore = Math.max(0, Math.min(100, Math.round(data.skore)))
      setResult(data)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return { status, result, error, analyze, reset }
}
