import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useExcelData } from '../hooks/useExcelData'
import { getGeminiKey } from '../lib/settings'
import type { WebEntry } from '../types/linkbuilding'

function getGeminiUrl(): string {
  const key = getGeminiKey()
  if (!key) throw new Error('Gemini API klíč není nastaven. Přejděte do Nastavení a zadejte klíč.')
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`
}

export interface ScoredEntry extends WebEntry {
  score: number
  themeReason: string
}

function getDrColor(dr: number | null): string {
  if (dr === null) return '#9ca3af'
  if (dr >= 60) return '#16a34a'
  if (dr >= 40) return '#0693e3'
  if (dr >= 20) return '#d97706'
  return '#dc2626'
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#16a34a'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

async function fetchWebContent(url: string): Promise<string> {
  const normalized = url.startsWith('http') ? url : `https://${url}`
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(normalized)}`
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return ''
    const html = await res.text()

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    doc.querySelectorAll('script, style, nav, footer').forEach(el => el.remove())

    const title = doc.querySelector('title')?.textContent?.trim() ?? ''
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? ''
    const h1s = Array.from(doc.querySelectorAll('h1')).map(h => h.textContent?.trim()).filter(Boolean).join(' | ')
    const h2s = Array.from(doc.querySelectorAll('h2')).slice(0, 8).map(h => h.textContent?.trim()).filter(Boolean).join(' | ')
    const bodyText = (doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 3000)

    return [title, metaDesc, h1s, h2s, bodyText].filter(Boolean).join('\n').slice(0, 4000)
  } catch {
    return ''
  }
}

async function geminiEvaluate(
  customerUrl: string,
  customerContent: string,
  candidates: WebEntry[]
): Promise<{ url: string; score: number; reason: string }[]> {

  // Format candidates compactly — give Gemini all important fields
  const candidateList = candidates.map((e, i) => {
    const parts = [
      `${i + 1}`,
      e.url,
      `DR:${e.dr ?? '?'}`,
      e.kategorie?.trim() || '—',
      e.ai?.trim().slice(0, 100) || '',
      e.kdeMuzeme?.trim() ? `✓dostupné:${e.kdeMuzeme.slice(0, 50)}` : '',
    ].filter(Boolean)
    return parts.join(' | ')
  }).join('\n')

  const prompt = `Jsi zkušený SEO specialista a expert na linkbuilding. Tvůj úkol je vybrat nejlepší weby pro umístění zpětných odkazů pro zákazníka.

## WEB ZÁKAZNÍKA
URL: ${customerUrl}
${customerContent
    ? `Obsah webu (title, popis, nadpisy, text):\n${customerContent.slice(0, 3000)}`
    : '(obsah webu se nepodařilo načíst — hodnoť dle URL)'}

## DATABÁZE WEBŮ PRO LINKBUILDING
Formát: číslo | url | DR | kategorie | AI popis | dostupnost
${candidateList}

## INSTRUKCE
Vyber přesně 10 nejlepších webů pro linkbuilding zákazníka. Hodnoť takto:

1. **Tematická relevance** (nejdůležitější): Web musí být tematicky příbuzný zákazníkovi — stejný obor, přidružený obor, nebo přirozené propojení témat. Nezaměřuj se jen na přesná slova — chápej sémantiku (stavba = stavební materiály = architektura = interiér atd.)
2. **Přirozenost odkazu**: Bylo by přirozené, že by takovýto web odkazoval na zákazníka?
3. **DR webu**: Vyšší DR = větší autorita, ale relevance je důležitější než DR
4. **Dostupnost**: Přednostně weby kde je vyplněno "dostupné"

Vrať JSON (pouze JSON, žádný text navíc):
{
  "recommendations": [
    {
      "url": "přesná url z databáze",
      "score": 85,
      "reason": "Konkrétní, specifický důvod proč se tento web hodí — zmiň tematické propojení, proč by odkaz byl přirozený"
    }
  ]
}

Score 0–100. Seřaď sestupně.`

  const res = await fetch(getGeminiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as Record<string, unknown>
    const msg = (errBody as { error?: { message?: string } }).error?.message ?? JSON.stringify(errBody).slice(0, 200)
    throw new Error(`Gemini API chyba: ${res.status} — ${msg}`)
  }
  const gemini = await res.json()
  const text = gemini.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Prázdná odpověď od Gemini')

  const parsed = JSON.parse(text)
  return parsed.recommendations ?? []
}

interface ResultCardProps {
  entry: ScoredEntry
  onSelect: (entry: ScoredEntry) => void
  selected: boolean
}

function ResultCard({ entry, onSelect, selected }: ResultCardProps) {
  const [saving, setSaving] = useState(false)

  const handleSelect = async () => {
    setSaving(true)
    await onSelect(entry)
    setSaving(false)
  }

  return (
    <div className="result-card">
      <div className="result-card-header">
        <a
          href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="result-card-url"
        >
          {entry.url}
        </a>
        <span className="result-score" style={{ color: getScoreColor(entry.score) }}>
          {entry.score}%
        </span>
      </div>

      <div className="result-card-badges">
        {entry.dr !== null && (
          <span className="badge-dr" style={{ background: getDrColor(entry.dr) }}>
            DR {entry.dr}
          </span>
        )}
        {entry.kategorie && (
          <span className="badge-category">{entry.kategorie.split(',')[0].trim()}</span>
        )}
        {entry.vymenaKoup && (
          <span className="badge-type">{entry.vymenaKoup}</span>
        )}
      </div>

      <p className="result-card-reason">{entry.themeReason}</p>

      <button
        className={`btn ${selected ? 'btn-selected' : 'btn-primary'}`}
        onClick={handleSelect}
        disabled={selected || saving}
      >
        {saving ? 'Ukládám...' : selected ? '✓ Vybráno' : 'Vybrat'}
      </button>
    </div>
  )
}

type Step = 'idle' | 'fetching' | 'analyzing' | 'done'

const STEP_LABEL: Record<Step, string> = {
  idle: '',
  fetching: 'Stahuji obsah webu zákazníka...',
  analyzing: 'AI vyhodnocuje nejlepší weby pro linkbuilding...',
  done: '',
}

export function AsistentPage() {
  const { data: webEntries, loading: dataLoading } = useExcelData()
  const [customerUrl, setCustomerUrl] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ScoredEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const analyze = async () => {
    if (!customerUrl.trim()) return
    setStep('fetching')
    setError(null)
    setResults([])
    setSelectedIds(new Set())

    try {
      // Step 1: Fetch real website content
      const content = await fetchWebContent(customerUrl.trim())

      // Step 2: Prepare candidates — exclude only explicitly blocked entries, send everything else
      setStep('analyzing')
      const candidates = webEntries
        .filter(e => !e.kdeNepouzivat?.trim())
        .sort((a, b) => (b.dr ?? 0) - (a.dr ?? 0))

      // Step 3: Let Gemini evaluate as a linkbuilding expert
      const recommendations = await geminiEvaluate(customerUrl.trim(), content, candidates)

      // Step 4: Map recommendations back to full entries
      const scored: ScoredEntry[] = recommendations
        .map(rec => {
          const entry = candidates.find(e =>
            e.url === rec.url ||
            e.url.replace(/^https?:\/\/(www\.)?/, '') === rec.url.replace(/^https?:\/\/(www\.)?/, '')
          )
          if (!entry) return null
          return { ...entry, score: rec.score, themeReason: rec.reason }
        })
        .filter((x): x is ScoredEntry => x !== null)

      setResults(scored)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se analyzovat web.')
      setStep('idle')
    }
  }

  const handleSelect = async (entry: ScoredEntry) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('planned_linkbuildings').insert({
      user_id: user.id,
      customer_url: customerUrl.trim(),
      web_url: entry.url,
      dr: entry.dr,
      score: entry.score,
      theme_reason: entry.themeReason,
    })

    setSelectedIds(prev => new Set([...prev, entry.url]))
  }

  const analyzing = step === 'fetching' || step === 'analyzing'

  return (
    <div className="asistent-page">
      <div className="asistent-input-section">
        <div className="asistent-input-wrap">
          <input
            type="url"
            className="asistent-input"
            placeholder="https://zakaznik.cz"
            value={customerUrl}
            onChange={e => setCustomerUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !analyzing && analyze()}
            disabled={analyzing || dataLoading}
          />
          <button
            className="btn btn-primary"
            onClick={analyze}
            disabled={analyzing || dataLoading || !customerUrl.trim()}
          >
            {analyzing ? 'Analyzuji...' : 'Analyzovat'}
          </button>
        </div>
        <p className="asistent-hint">
          AI stáhne obsah webu zákazníka a jako expert na linkbuilding vybere top 10 nejlepších příležitostí z databáze.
        </p>
      </div>

      {analyzing && (
        <div className="page-state">
          <div className="spinner" />
          <p>{STEP_LABEL[step]}</p>
        </div>
      )}

      {error && (
        <div className="page-state error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {step === 'done' && results.length > 0 && (
        <>
          <div className="asistent-topic-bar">
            <span className="asistent-topic-label">Top {results.length} doporučení</span>
            <span className="asistent-results-count">pro {customerUrl}</span>
          </div>
          <div className="results-grid">
            {results.map(entry => (
              <ResultCard
                key={entry.url}
                entry={entry}
                onSelect={handleSelect}
                selected={selectedIds.has(entry.url)}
              />
            ))}
          </div>
        </>
      )}

      {step === 'idle' && !error && (
        <div className="empty-state">
          <span className="empty-icon">🤖</span>
          <h2>Linkbuilding asistent</h2>
          <p>Zadej URL zákazníka — AI stáhne obsah jeho webu a jako expert na linkbuilding vybere top 10 nejvhodnějších webů z {webEntries.length} webů v databázi.</p>
        </div>
      )}
    </div>
  )
}
