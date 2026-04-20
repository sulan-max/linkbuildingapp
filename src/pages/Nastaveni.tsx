import { useState, useRef, useEffect } from 'react'
import { getGeminiKey, getAhrefsKey, getCountry, saveSettings } from '../lib/settings'

const SUPABASE_URL = 'https://njtjpbmudwhadozfpkll.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdGpwYm11ZHdoYWRvemZwa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzYwMjEsImV4cCI6MjA5MTE1MjAyMX0.5XUVSVKTP28gM-tEfslp-EYWtCpBMtP51ExNd3YVtM4'

async function callProxy(endpoint: string, method: string, params: Record<string, string>, key: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ahrefs-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
    body: JSON.stringify({ endpoint, method, params, ahrefsKey: key }),
    signal: AbortSignal.timeout(15000),
  })
  const data = await res.json() as Record<string, unknown>
  return { ok: res.ok, status: res.status, data }
}

async function testAhrefsKey(key: string): Promise<string> {
  const lines: string[] = []

  // Test 1: subscription info — verifies key is valid
  const sub = await callProxy('subscription-info/limits-and-usage', 'GET', {}, key)
  lines.push(`subscription-info: ${sub.ok ? '✓ OK' : `✗ ${sub.status} — ${sub.data.error ?? sub.data.message ?? 'chyba'}`}`)

  // Test 2: site-explorer/organic-competitors — used by Hledání webů (real domain, not ahrefs.com)
  const se = await callProxy('site-explorer/organic-competitors', 'GET', {
    target: 'seznam.cz', country: 'cz', date: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10) })(),
    select: 'competitor_domain,domain_rating,traffic,keywords_common', mode: 'subdomains', limit: '3', order_by: 'traffic:desc',
  }, key)
  lines.push(`site-explorer/organic-competitors: ${se.ok ? '✓ OK' : `✗ ${se.status} — ${se.data.error ?? se.data.message ?? JSON.stringify(se.data).slice(0, 100)}`}`)

  return lines.join('\n')
}

export function NastaveniPage() {
  const [gemini, setGemini] = useState(getGeminiKey)
  const [ahrefs, setAhrefs] = useState(getAhrefsKey)
  const [country, setCountry] = useState(getCountry)
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSave = () => {
    saveSettings(gemini.trim(), ahrefs.trim(), country)
    setSaved(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    if (!ahrefs.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testAhrefsKey(ahrefs.trim())
      setTestResult(result)
    } catch (err) {
      setTestResult(`Chyba: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div className="nastaveni-page">
      <div className="nastaveni-card">
        <h2 className="nastaveni-title">API klíče</h2>

        <div className="nastaveni-field">
          <label className="nastaveni-label">
            Gemini API klíč
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="nastaveni-link"
            >
              Získat klíč →
            </a>
          </label>
          <input
            type="password"
            className="nastaveni-input"
            value={gemini}
            onChange={e => setGemini(e.target.value)}
            placeholder="AIza..."
            autoComplete="off"
          />
        </div>

        <div className="nastaveni-field">
          <label className="nastaveni-label">
            Ahrefs API klíč
            <a
              href="https://app.ahrefs.com/api"
              target="_blank"
              rel="noopener noreferrer"
              className="nastaveni-link"
            >
              Získat klíč →
            </a>
          </label>
          <input
            type="password"
            className="nastaveni-input"
            value={ahrefs}
            onChange={e => setAhrefs(e.target.value)}
            placeholder="Ahrefs API token"
            autoComplete="off"
          />
          <button
            className="btn btn-outline"
            style={{ marginTop: '8px' }}
            onClick={handleTest}
            disabled={testing || !ahrefs.trim()}
          >
            {testing ? 'Testuji...' : 'Otestovat Ahrefs klíč'}
          </button>
          {testResult && (
            <p style={{
              marginTop: '8px',
              fontSize: '12px',
              color: testResult.startsWith('OK') ? '#16a34a' : '#dc2626',
              wordBreak: 'break-all',
            }}>
              {testResult}
            </p>
          )}
        </div>

        <div className="nastaveni-field">
          <label className="nastaveni-label">Výchozí země pro Ahrefs data</label>
          <select
            className="nastaveni-input"
            value={country}
            onChange={e => setCountry(e.target.value)}
          >
            <option value="cz">Česká republika (cz)</option>
            <option value="sk">Slovensko (sk)</option>
            <option value="pl">Polsko (pl)</option>
            <option value="de">Německo (de)</option>
            <option value="gb">Velká Británie (gb)</option>
            <option value="us">USA (us)</option>
          </select>
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ Uloženo' : 'Uložit nastavení'}
        </button>

        <p className="nastaveni-note">
          Klíče jsou uloženy pouze v prohlížeči (localStorage). Nikdy neopouštějí vaše zařízení.
        </p>
      </div>
    </div>
  )
}
