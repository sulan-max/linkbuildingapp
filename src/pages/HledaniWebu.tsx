import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { getGeminiKey, getAhrefsKey, getCountry } from '../lib/settings'
import {
  getOrganicCompetitors,
  isBlacklisted,
  type BatchMetrics,
} from '../lib/ahrefs'
import { analyzeCustomer, scoreOpportunities } from '../lib/gemini-discovery'
import type { Opportunity, CustomerProfile } from '../types/linkbuilding'

// Reuse fetchWebContent — inline here to keep files independent
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

type Step =
  | 'idle'
  | 'fetching-content'
  | 'analyzing-customer'
  | 'discovering-competitors'
  | 'scoring'
  | 'done'

const STEP_LABELS: Record<Step, string> = {
  'idle': '',
  'fetching-content': 'Stahuji obsah webu zákazníka...',
  'analyzing-customer': 'AI analyzuje obor zákazníka...',
  'discovering-competitors': 'Hledám konkurenční weby v Ahrefs...',
  'scoring': 'AI hodnotí příležitosti pro linkbuilding...',
  'done': '',
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
  if (score >= 50) return '#d97706'
  return '#dc2626'
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Snadné',
  medium: 'Střední',
  hard: 'Náročné',
}

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: '#16a34a',
  medium: '#d97706',
  hard: '#dc2626',
}

const OPPORTUNITY_LABEL: Record<string, string> = {
  'guest-post': 'Guest post',
  'resource-page': 'Resource page',
  'directory': 'Adresář',
  'mention': 'Zmínka',
  'product-review': 'Recenze',
  'news-coverage': 'Článek/zpráva',
  'broken-link': 'Broken link',
}

interface OpportunityCardProps {
  opp: Opportunity
  onSave: (opp: Opportunity) => Promise<void>
  saved: boolean
}

function OpportunityCard({ opp, onSave, saved }: OpportunityCardProps) {
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(opp)
    setSaving(false)
  }

  return (
    <div className={`opp-card ${expanded ? 'opp-card--expanded' : ''}`}>
      <div className="opp-card-header">
        <div className="opp-card-left">
          <a
            href={`https://${opp.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="opp-card-domain"
          >
            {opp.domain}
          </a>
          <div className="opp-card-badges">
            {opp.domain_rating !== null && (
              <span className="badge-dr" style={{ background: getDrColor(opp.domain_rating) }}>
                DR {opp.domain_rating}
              </span>
            )}
            {opp.org_traffic !== null && (
              <span className="badge-traffic">
                {opp.org_traffic.toLocaleString('cs')} nav/měs
              </span>
            )}
            <span className="badge-type">{OPPORTUNITY_LABEL[opp.opportunityType] ?? opp.opportunityType}</span>
            <span
              className="badge-difficulty"
              style={{ color: DIFFICULTY_COLOR[opp.outreachDifficulty] }}
            >
              {DIFFICULTY_LABEL[opp.outreachDifficulty] ?? opp.outreachDifficulty}
            </span>
          </div>
        </div>
        <span
          className="opp-score"
          style={{ color: getScoreColor(opp.relevanceScore) }}
        >
          {opp.relevanceScore}%
        </span>
      </div>

      <p className="opp-reason">{opp.reason}</p>

      {expanded && (
        <div className="opp-angle">
          <span className="opp-angle-label">Úhel oslovení</span>
          <p>{opp.outreachAngle}</p>
        </div>
      )}

      <div className="opp-card-footer">
        <button
          className="btn btn-ghost"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? 'Skrýt detail' : 'Zobrazit úhel oslovení'}
        </button>
        <button
          className={`btn ${saved ? 'btn-selected' : 'btn-primary'}`}
          onClick={handleSave}
          disabled={saved || saving}
        >
          {saving ? 'Ukládám...' : saved ? '✓ Uloženo' : 'Přidat do plánu'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────

const SESSION_KEY = 'hledani_last'

function saveSession(url: string, opps: Opportunity[], prof: CustomerProfile, st: { discovered: number; afterFilter: number }) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ url, opps, prof, st })) } catch { /* ignore */ }
}

function loadSession(): { url: string; opps: Opportunity[]; prof: CustomerProfile; st: { discovered: number; afterFilter: number } } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function HledaniWebuPage() {
  const saved = loadSession()
  const [customerUrl, setCustomerUrl] = useState(saved?.url ?? '')
  const [step, setStep] = useState<Step>(saved ? 'done' : 'idle')
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<CustomerProfile | null>(saved?.prof ?? null)
  const [opportunities, setOpportunities] = useState<Opportunity[]>(saved?.opps ?? [])
  const [savedDomains, setSavedDomains] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<{ discovered: number; afterFilter: number } | null>(saved?.st ?? null)

  const geminiKey = getGeminiKey()
  const ahrefsKey = getAhrefsKey()
  const country = getCountry()

  const missingKeys = !geminiKey || !ahrefsKey

  const run = async () => {
    if (!customerUrl.trim() || missingKeys) return
    setStep('fetching-content')
    setError(null)
    setOpportunities([])
    setProfile(null)
    setStats(null)

    try {
      // Step 1: Fetch customer website content
      const content = await fetchWebContent(customerUrl.trim())

      // Step 2: Gemini analyzes customer niche + keywords
      setStep('analyzing-customer')
      const customerProfile = await analyzeCustomer(customerUrl.trim(), content, geminiKey)
      setProfile(customerProfile)

      // Step 3: Ahrefs — find competing domains + competitors of top competitors
      setStep('discovering-competitors')
      const customerDomain = customerUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]

      let firstLevel: Awaited<ReturnType<typeof getOrganicCompetitors>> = []
      try {
        firstLevel = await getOrganicCompetitors(customerDomain, country, ahrefsKey)
      } catch (err) {
        throw new Error(`Ahrefs: ${err instanceof Error ? err.message : String(err)}`)
      }

      // Get competitors of top 6 competitors in parallel (second level)
      const topForExpansion = firstLevel.slice(0, 6).map(c => c.domain)
      const secondLevelResults = await Promise.all(
        topForExpansion.map(domain =>
          getOrganicCompetitors(domain, country, ahrefsKey).catch(() => [])
        )
      )
      const allCompetitors = [...firstLevel, ...secondLevelResults.flat()]

      // Deduplicate by domain, keep best traffic
      const domainMap = new Map<string, typeof allCompetitors[0]>()
      for (const c of allCompetitors) {
        if (!c.domain) continue
        const existing = domainMap.get(c.domain)
        if (!existing || (c.traffic ?? 0) > (existing.traffic ?? 0)) {
          domainMap.set(c.domain, c)
        }
      }

      // Quality filter: DR 15–90, traffic >= 100
      const qualified: BatchMetrics[] = [...domainMap.values()]
        .filter(c =>
          !isBlacklisted(c.domain) &&
          c.domain !== customerDomain &&
          c.domain_rating !== null && c.domain_rating >= 15 && c.domain_rating <= 90 &&
          c.traffic !== null && c.traffic >= 100
        )
        .sort((a, b) => (b.traffic ?? 0) - (a.traffic ?? 0))
        .slice(0, 80)
        .map(c => ({
          domain: c.domain,
          domain_rating: c.domain_rating,
          org_traffic: c.traffic,
          refdomains: null,
          backlinks: null,
          backlinks_dofollow: null,
          backlinks_nofollow: null,
          outgoing_links: null,
        }))

      setStats({ discovered: domainMap.size, afterFilter: qualified.length })

      if (qualified.length === 0) {
        throw new Error(
          firstLevel.length === 0
            ? 'Ahrefs nenašel žádné konkurenční weby. Doména je příliš malá nebo nová.'
            : 'Žádný konkurent neprojde filtrem kvality (DR 15–90, traffic > 100/měs).'
        )
      }

      // Step 4: Gemini scores each qualified site
      setStep('scoring')
      const scored = await scoreOpportunities(customerUrl.trim(), customerProfile, qualified, geminiKey)

      setOpportunities(scored)
      setStep('done')
      saveSession(customerUrl.trim(), scored, customerProfile, { discovered: domainMap.size, afterFilter: qualified.length })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se dokončit analýzu.')
      setStep('idle')
    }
  }

  const handleSave = async (opp: Opportunity) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('planned_linkbuildings').insert({
      user_id: user.id,
      customer_url: customerUrl.trim(),
      web_url: opp.domain,
      dr: opp.domain_rating,
      score: opp.relevanceScore,
      theme_reason: opp.reason,
    })

    setSavedDomains(prev => new Set([...prev, opp.domain]))
  }

  const isRunning = step !== 'idle' && step !== 'done'

  return (
    <div className="hledani-page">
      {/* Input */}
      <div className="asistent-input-section">
        <div className="asistent-input-wrap">
          <input
            type="url"
            className="asistent-input"
            placeholder="https://zakaznik.cz"
            value={customerUrl}
            onChange={e => setCustomerUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isRunning && run()}
            disabled={isRunning || missingKeys}
          />
          <button
            className="btn btn-primary"
            onClick={run}
            disabled={isRunning || missingKeys || !customerUrl.trim()}
          >
            {isRunning ? 'Hledám...' : 'Hledat příležitosti'}
          </button>
        </div>
        {missingKeys && (
          <p className="hledani-keys-warning">
            Nastav Gemini a Ahrefs API klíče v{' '}
            <strong>Nastavení</strong> před spuštěním.
          </p>
        )}
        {!missingKeys && (
          <p className="asistent-hint">
            AI analyzuje obor zákazníka, Ahrefs najde reálné weby s traffic, AI vyhodnotí každou příležitost.
          </p>
        )}
      </div>

      {/* Loading state */}
      {isRunning && (
        <div className="page-state">
          <div className="spinner" />
          <p>{STEP_LABELS[step]}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="page-state error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Results */}
      {step === 'done' && opportunities.length > 0 && (
        <>
          <div className="hledani-results-bar">
            <div className="hledani-results-info">
              <span className="hledani-results-count">{opportunities.length} příležitostí</span>
              {stats && (
                <span className="hledani-results-sub">
                  z {stats.discovered} nalezených webů → {stats.afterFilter} prošlo filtrem kvality
                </span>
              )}
            </div>
            {profile && (
              <span className="hledani-niche-badge">{profile.mainNiche}</span>
            )}
          </div>

          <div className="opp-grid">
            {opportunities.map(opp => (
              <OpportunityCard
                key={opp.domain}
                opp={opp}
                onSave={handleSave}
                saved={savedDomains.has(opp.domain)}
              />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {step === 'idle' && !error && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <h2>Hledání nových webů</h2>
          <p>
            Zadej URL zákazníka — AI analyzuje jeho obor, Ahrefs najde reálné weby s organickým traffic
            a AI každý web ohodnotí jako linkbuilding příležitost s konkrétním námětem k oslovení.
          </p>
        </div>
      )}
    </div>
  )
}
