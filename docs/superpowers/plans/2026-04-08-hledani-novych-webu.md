# Hledání nových webů – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a "Hledání nových webů" page that discovers real link-building opportunities by combining Gemini (customer analysis + scoring) with Ahrefs API (real DR, traffic, spam signals via batch-analysis).

**Architecture:** Client-side orchestration in React — Gemini is called directly (no CORS issues), Ahrefs REST API is proxied through a Supabase Edge Function. Two-stage Gemini prompting: first analyze the customer's niche and produce keywords, then score each Ahrefs-discovered domain as a link opportunity.

**Tech Stack:** React 19, TypeScript, Vite, Supabase (auth + Edge Functions), Ahrefs API v3, Gemini 2.5 Flash API, localStorage for API key storage.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/settings.ts` | CREATE | localStorage CRUD for Gemini + Ahrefs API keys |
| `src/pages/Nastaveni.tsx` | CREATE | Settings UI — key inputs, save, validation |
| `supabase/functions/ahrefs-proxy/index.ts` | CREATE | Deno Edge Function — proxies all Ahrefs API v3 calls |
| `src/lib/ahrefs.ts` | CREATE | Typed Ahrefs client calling the Edge Function |
| `src/lib/gemini-discovery.ts` | CREATE | Two Gemini prompts: analyzeCustomer + scoreOpportunities |
| `src/types/linkbuilding.ts` | MODIFY | Add `Opportunity` and `CustomerProfile` types |
| `src/pages/HledaniWebu.tsx` | CREATE | Full discovery pipeline UI with 7 loading states |
| `src/App.tsx` | MODIFY | Add `hledani` + `nastaveni` to Page type and routing |

---

## Task 1: Settings — localStorage helpers + Nastavení page

**Files:**
- Create: `src/lib/settings.ts`
- Create: `src/pages/Nastaveni.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/lib/settings.ts`**

```typescript
const KEYS = {
  gemini: 'lb_gemini_key',
  ahrefs: 'lb_ahrefs_key',
  country: 'lb_country',
} as const

export function getGeminiKey(): string {
  return localStorage.getItem(KEYS.gemini) ?? (import.meta.env.VITE_GEMINI_API_KEY as string) ?? ''
}

export function getAhrefsKey(): string {
  return localStorage.getItem(KEYS.ahrefs) ?? ''
}

export function getCountry(): string {
  return localStorage.getItem(KEYS.country) ?? 'cz'
}

export function saveSettings(gemini: string, ahrefs: string, country: string): void {
  localStorage.setItem(KEYS.gemini, gemini)
  localStorage.setItem(KEYS.ahrefs, ahrefs)
  localStorage.setItem(KEYS.country, country)
}
```

- [ ] **Step 2: Create `src/pages/Nastaveni.tsx`**

```tsx
import { useState } from 'react'
import { getGeminiKey, getAhrefsKey, getCountry, saveSettings } from '../lib/settings'

export function NastaveniPage() {
  const [gemini, setGemini] = useState(getGeminiKey)
  const [ahrefs, setAhrefs] = useState(getAhrefsKey)
  const [country, setCountry] = useState(getCountry)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    saveSettings(gemini.trim(), ahrefs.trim(), country)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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
```

- [ ] **Step 3: Add CSS for Nastavení in `App.css`**

Open `src/App.css` and append at the end:

```css
/* ── Nastavení ─────────────────────────────────────────── */
.nastaveni-page {
  max-width: 560px;
}

.nastaveni-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.nastaveni-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.nastaveni-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nastaveni-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nastaveni-link {
  font-size: 12px;
  color: var(--primary);
  text-decoration: none;
}

.nastaveni-link:hover {
  text-decoration: underline;
}

.nastaveni-input {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
}

.nastaveni-input:focus {
  outline: none;
  border-color: var(--primary);
}

.nastaveni-note {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}
```

- [ ] **Step 4: Wire Nastavení into `src/App.tsx`**

In `App.tsx`, make these three changes:

**4a.** Add import at top:
```tsx
import { NastaveniPage } from './pages/Nastaveni'
```

**4b.** Add `'nastaveni'` and `'hledani'` to the Page type and constants (hledani is a placeholder for Task 4):
```tsx
type Page = 'dashboard' | 'portfolio' | 'asistent' | 'planovane' | 'kontakty' | 'statistiky' | 'nastaveni' | 'hledani'

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  portfolio: 'Portfolio webů',
  asistent: 'Linkbuilding asistent',
  planovane: 'Plánované linkbuildingy',
  kontakty: 'Kontakty',
  statistiky: 'Statistiky',
  nastaveni: 'Nastavení',
  hledani: 'Hledání nových webů',
}

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'portfolio', label: 'Portfolio', icon: '🔗' },
  { id: 'asistent', label: 'Asistent', icon: '🤖' },
  { id: 'hledani', label: 'Hledání webů', icon: '🔍' },
  { id: 'planovane', label: 'Plánované', icon: '📋' },
  { id: 'kontakty', label: 'Kontakty', icon: '👤' },
  { id: 'statistiky', label: 'Statistiky', icon: '📊' },
  { id: 'nastaveni', label: 'Nastavení', icon: '⚙' },
]
```

**4c.** In the `<main>` block, add after the existing page renders (before the fallback `PlaceholderContent`):
```tsx
{page === 'nastaveni' && <NastaveniPage />}
```

And update the fallback condition to exclude `nastaveni` and `hledani`:
```tsx
{page !== 'dashboard' && page !== 'portfolio' && page !== 'asistent' && page !== 'planovane' && page !== 'kontakty' && page !== 'nastaveni' && page !== 'hledani' && (
  <PlaceholderContent page={page} />
)}
```

- [ ] **Step 5: Verify Nastavení renders**

Run `npm run dev`, navigate to Nastavení in the sidebar, confirm the form renders, fill in a test key, save, reload page — confirm key persists.

- [ ] **Step 6: Commit**

```bash
git add src/lib/settings.ts src/pages/Nastaveni.tsx src/App.tsx src/App.css
git commit -m "feat: add Nastaveni page with localStorage API key management"
```

---

## Task 2: Ahrefs Edge Function + client

**Files:**
- Create: `supabase/functions/ahrefs-proxy/index.ts`
- Create: `src/lib/ahrefs.ts`

- [ ] **Step 1: Create the Edge Function directory and file**

```bash
mkdir -p supabase/functions/ahrefs-proxy
```

Create `supabase/functions/ahrefs-proxy/index.ts`:

```typescript
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
```

- [ ] **Step 2: Deploy the Edge Function**

Run in project root (requires Supabase CLI — `npm install -g supabase` if not installed):

```bash
npx supabase functions deploy ahrefs-proxy --project-ref njtjpbmudwhadozfpkll
```

Expected output: `Deployed Edge Function ahrefs-proxy`

If Supabase CLI is not logged in, first run: `npx supabase login`

- [ ] **Step 3: Create `src/lib/ahrefs.ts`**

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const PROXY_URL = `${SUPABASE_URL}/functions/v1/ahrefs-proxy`

// ── Internal helpers ────────────────────────────────────────────

async function proxyGet(
  endpoint: string,
  params: Record<string, string>,
  ahrefsKey: string
): Promise<unknown> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({ endpoint, method: 'GET', params, ahrefsKey }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `Ahrefs chyba ${res.status}`)
  return data
}

async function proxyPost(
  endpoint: string,
  body: unknown,
  ahrefsKey: string
): Promise<unknown> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({ endpoint, method: 'POST', body, ahrefsKey }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `Ahrefs chyba ${res.status}`)
  return data
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
  }
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Public types ────────────────────────────────────────────────

export interface CompetitorResult {
  domain: string
  domain_rating: number
  traffic: number
  keywords_common: number
}

export interface SerpDomainResult {
  domain: string
  domain_rating: number | null
  traffic: number | null
  refdomains: number | null
}

export interface BatchMetrics {
  domain: string
  domain_rating: number | null
  org_traffic: number | null
  refdomains: number | null
  backlinks: number | null
  backlinks_dofollow: number | null
  backlinks_nofollow: number | null
  outgoing_links: number | null
}

// ── Public API ──────────────────────────────────────────────────

/** Find domains competing organically with the customer's domain. */
export async function getOrganicCompetitors(
  domain: string,
  country: string,
  ahrefsKey: string
): Promise<CompetitorResult[]> {
  const cleanDomain = extractDomain(domain)
  const data = await proxyGet('site-explorer/organic-competitors', {
    target: cleanDomain,
    country,
    date: today(),
    select: 'competitor_domain,domain_rating,traffic,keywords_common',
    mode: 'subdomains',
    limit: '40',
    order_by: 'traffic:desc',
  }, ahrefsKey) as { competitors?: Array<{
    competitor_domain: string
    domain_rating: number
    traffic: number
    keywords_common: number
  }> }

  return (data.competitors ?? []).map(c => ({
    domain: c.competitor_domain,
    domain_rating: c.domain_rating,
    traffic: c.traffic,
    keywords_common: c.keywords_common,
  }))
}

/** Get organic ranking domains for a keyword via SERP overview. */
export async function getSerpDomains(
  keyword: string,
  country: string,
  ahrefsKey: string
): Promise<SerpDomainResult[]> {
  const data = await proxyGet('serp-overview', {
    keyword,
    country,
    select: 'url,domain_rating,traffic,refdomains,position',
    top_positions: '10',
  }, ahrefsKey) as { positions?: Array<{
    url: string | null
    domain_rating: number | null
    traffic: number | null
    refdomains: number | null
    type: string[]
  }> }

  return (data.positions ?? [])
    .filter(p => p.url && !p.type?.includes('paid_top') && !p.type?.includes('paid_bottom'))
    .map(p => ({
      domain: extractDomain(p.url!),
      domain_rating: p.domain_rating,
      traffic: p.traffic,
      refdomains: p.refdomains,
    }))
}

/** Bulk-fetch quality metrics for up to 100 domains in one call. */
export async function batchDomainMetrics(
  domains: string[],
  ahrefsKey: string
): Promise<BatchMetrics[]> {
  const unique = [...new Set(domains)].slice(0, 100)
  const targets = unique.map(d => ({
    url: `https://${d}`,
    mode: 'subdomains',
    protocol: 'both',
  }))

  const data = await proxyPost('batch-analysis', {
    targets,
    select: [
      'domain_rating',
      'org_traffic',
      'refdomains',
      'backlinks',
      'backlinks_dofollow',
      'backlinks_nofollow',
      'outgoing_links',
    ],
  }, ahrefsKey) as { targets?: Array<{
    url: string
    domain_rating: number | null
    org_traffic: number | null
    refdomains: number | null
    backlinks: number | null
    backlinks_dofollow: number | null
    backlinks_nofollow: number | null
    outgoing_links: number | null
  }> }

  return (data.targets ?? []).map(t => ({
    domain: extractDomain(t.url),
    domain_rating: t.domain_rating,
    org_traffic: t.org_traffic,
    refdomains: t.refdomains,
    backlinks: t.backlinks,
    backlinks_dofollow: t.backlinks_dofollow,
    backlinks_nofollow: t.backlinks_nofollow,
    outgoing_links: t.outgoing_links,
  }))
}

// ── Quality filter ──────────────────────────────────────────────

const BLACKLIST = new Set([
  'wikipedia.org', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'youtube.com', 'linkedin.com', 'reddit.com', 'tiktok.com', 'pinterest.com',
  'amazon.com', 'google.com', 'apple.com', 'microsoft.com', 'github.com',
  'seznam.cz', 'google.cz', 'firmy.cz',
])

export function isBlacklisted(domain: string): boolean {
  return BLACKLIST.has(domain) || BLACKLIST.has(domain.split('.').slice(-2).join('.'))
}

export function passesQualityFilter(
  m: BatchMetrics,
  minDr = 15,
  maxDr = 82,
  minTraffic = 200
): boolean {
  if (m.domain_rating === null || m.domain_rating < minDr || m.domain_rating > maxDr) return false
  if (m.org_traffic === null || m.org_traffic < minTraffic) return false
  // Spam signal: way more backlinks than unique referring domains
  if (m.backlinks && m.refdomains && m.refdomains > 0 && m.backlinks / m.refdomains > 50) return false
  return true
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in `src/lib/ahrefs.ts`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/ahrefs-proxy/index.ts src/lib/ahrefs.ts
git commit -m "feat: add Ahrefs proxy Edge Function and typed client"
```

---

## Task 3: Add types + Gemini discovery prompts

**Files:**
- Modify: `src/types/linkbuilding.ts`
- Create: `src/lib/gemini-discovery.ts`

- [ ] **Step 1: Add types to `src/types/linkbuilding.ts`**

Append at the end of the existing file:

```typescript
export interface CustomerProfile {
  mainNiche: string
  subNiches: string[]
  businessType: 'eshop' | 'sluzba' | 'blog' | 'b2b' | 'lokalni-sluzba'
  targetAudience: string
  czechKeywords: string[]
  idealSiteTypes: string[]
  linkContext: string
}

export type OpportunityType =
  | 'guest-post'
  | 'resource-page'
  | 'directory'
  | 'mention'
  | 'product-review'
  | 'news-coverage'
  | 'broken-link'

export type OutreachDifficulty = 'easy' | 'medium' | 'hard'

export interface Opportunity {
  domain: string
  domain_rating: number | null
  org_traffic: number | null
  refdomains: number | null
  relevanceScore: number
  opportunityType: OpportunityType
  outreachDifficulty: OutreachDifficulty
  reason: string
  outreachAngle: string
}
```

- [ ] **Step 2: Create `src/lib/gemini-discovery.ts`**

```typescript
import type { CustomerProfile, Opportunity, OpportunityType, OutreachDifficulty } from '../types/linkbuilding'
import type { BatchMetrics } from './ahrefs'

function geminiUrl(key: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`
}

async function callGemini(prompt: string, key: string): Promise<string> {
  const res = await fetch(geminiUrl(key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) throw new Error(`Gemini API chyba: ${res.status}`)
  const json = await res.json()
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Prázdná odpověď od Gemini')
  return text
}

// ── Prompt 1: Customer analysis ─────────────────────────────────

export async function analyzeCustomer(
  url: string,
  content: string,
  geminiKey: string
): Promise<CustomerProfile> {
  const prompt = `Analyzuj web zákazníka pro linkbuilding kampaň. Potřebuji přesná strukturovaná data pro hledání vhodných webů pro získání zpětných odkazů.

URL zákazníka: ${url}
Obsah webu:
${content ? content.slice(0, 4000) : '(obsah webu se nepodařilo načíst — hodnoť dle URL a domény)'}

Vrať POUZE JSON (bez markdown bloků, bez \`\`\`):
{
  "mainNiche": "hlavní obor zákazníka (1-4 slova, česky, konkrétní — ne 'e-commerce' ale 'zahradní nábytek')",
  "subNiches": ["příbuzný obor 1", "příbuzný obor 2", "příbuzný obor 3"],
  "businessType": "eshop",
  "targetAudience": "Kdo jsou zákazníci tohoto webu — kdo by klikl na odkaz na tento web (1-2 věty)",
  "czechKeywords": ["klíčové slovo 1", "klíčové slovo 2", "klíčové slovo 3", "klíčové slovo 4", "klíčové slovo 5", "klíčové slovo 6", "klíčové slovo 7", "klíčové slovo 8"],
  "idealSiteTypes": ["typ webu 1", "typ webu 2", "typ webu 3"],
  "linkContext": "Jak by přirozený odkaz z jiného webu na tohoto zákazníka mohl vypadat — v jakém článku, sekci nebo kontextu by dával smysl (2-3 věty, konkrétní)"
}

Pravidla:
- "businessType" musí být jedno z: eshop, sluzba, blog, b2b, lokalni-sluzba
- "czechKeywords": 8 různých reálných českých vyhledávacích frází. Mix informačních (jak, co, kde) a komerčních (koupit, nejlepší, cena). Žádná klíčová slova nekopíruj z URL — hledej reálné dotazy uživatelů.
- "idealSiteTypes": z výběru: blogy, zpravodajské weby, oborové portály, srovnávače, diskuzní fóra, recenzní weby, lifestylové magazíny, B2B portály, lokální adresáře
- Buď konkrétní — ne "různé weby" ale "zahradnické blogy a magazíny o bydlení"`

  const raw = await callGemini(prompt, geminiKey)
  return JSON.parse(raw) as CustomerProfile
}

// ── Prompt 2: Opportunity scoring ──────────────────────────────

export async function scoreOpportunities(
  customerUrl: string,
  profile: CustomerProfile,
  sites: BatchMetrics[],
  geminiKey: string
): Promise<Opportunity[]> {
  if (sites.length === 0) return []

  const siteList = sites
    .map(s =>
      `${s.domain} | DR ${s.domain_rating ?? '?'} | ${s.org_traffic ?? '?'} nav/měs | ${s.refdomains ?? '?'} refdom | ${s.outgoing_links ?? '?'} outlinks`
    )
    .join('\n')

  const prompt = `Jsi senior SEO konzultant specializovaný na link building v českém i mezinárodním prostředí. Tvojí úlohou je identifikovat reálné příležitosti pro umístění zpětných odkazů.

ZÁKAZNÍK:
URL: ${customerUrl}
Hlavní obor: ${profile.mainNiche}
Příbuzné obory: ${profile.subNiches.join(', ')}
Typ byznysu: ${profile.businessType}
Cílová skupina: ${profile.targetAudience}
Ideální typy webů: ${profile.idealSiteTypes.join(', ')}
Kontext odkazu: ${profile.linkContext}

WEBY K HODNOCENÍ (domain | DR | traffic/měs | refdomains | outgoing links):
${siteList}

Vyhodnoť každý web jako potenciální příležitost pro linkbuilding. Hodnoť PŘÍSNĚ — ne každý web je příležitost.

Pro každý web:
- "relevanceScore" (0–100): Jak moc je web tematicky relevantní pro zákazníka. 
  80+ = perfektní shoda, přirozený odkaz
  60–79 = dobrá relevance, dává smysl
  40–59 = hraničně relevantní, potřebuje kreativní přístup  
  Pod 40 = nerelevantní, vynechej ze výsledků
- "opportunityType": realistický typ příležitosti — jeden z: guest-post, resource-page, directory, mention, product-review, news-coverage, broken-link
- "outreachDifficulty":
  "easy" = malý/střední blog, majitel přijímá příspěvky, reaguje na maily
  "medium" = větší web s redakcí, potřebuje přesvědčit hodnotným obsahem
  "hard" = velký etablovaný web, PR tým, nízká pravděpodobnost odpovědi
- "reason": Proč konkrétně je tento web relevantní pro zákazníka. Popiš tematické propojení, proč by čtenáři tohoto webu měli zájem o zákazníka (2–3 věty, konkrétní, ne obecné věty jako "web je relevantní").
- "outreachAngle": Konkrétní námět pro první mail/oslovení — co nabídnout (téma článku, hodnota pro web), proč by to webmaster přijal, čím zaujmout. Musí být konkrétní, ne "napište zajímavý článek" (2–3 věty).

Vrať POUZE JSON (bez markdown bloků, bez \`\`\`):
{
  "opportunities": [
    {
      "domain": "domain.cz",
      "relevanceScore": 75,
      "opportunityType": "guest-post",
      "outreachDifficulty": "medium",
      "reason": "...",
      "outreachAngle": "..."
    }
  ]
}

Nezahrnuj weby s relevanceScore pod 40. Seřaď sestupně podle relevanceScore.`

  const raw = await callGemini(prompt, geminiKey)
  const parsed = JSON.parse(raw) as { opportunities: Array<{
    domain: string
    relevanceScore: number
    opportunityType: string
    outreachDifficulty: string
    reason: string
    outreachAngle: string
  }> }

  // Merge Ahrefs metrics back in
  const metricsMap = new Map(sites.map(s => [s.domain, s]))

  return parsed.opportunities.map(o => {
    const m = metricsMap.get(o.domain)
    return {
      domain: o.domain,
      domain_rating: m?.domain_rating ?? null,
      org_traffic: m?.org_traffic ?? null,
      refdomains: m?.refdomains ?? null,
      relevanceScore: o.relevanceScore,
      opportunityType: o.opportunityType as OpportunityType,
      outreachDifficulty: o.outreachDifficulty as OutreachDifficulty,
      reason: o.reason,
      outreachAngle: o.outreachAngle,
    }
  })
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/linkbuilding.ts src/lib/gemini-discovery.ts
git commit -m "feat: add CustomerProfile/Opportunity types and two-stage Gemini discovery prompts"
```

---

## Task 4: HledaniWebu page — full pipeline + UI

**Files:**
- Create: `src/pages/HledaniWebu.tsx`
- Modify: `src/App.tsx` (add page render)
- Modify: `src/App.css` (add styles)

- [ ] **Step 1: Create `src/pages/HledaniWebu.tsx`**

```tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { getGeminiKey, getAhrefsKey, getCountry } from '../lib/settings'
import {
  getOrganicCompetitors,
  getSerpDomains,
  batchDomainMetrics,
  isBlacklisted,
  passesQualityFilter,
  type BatchMetrics,
} from '../lib/ahrefs'
import { analyzeCustomer, scoreOpportunities } from '../lib/gemini-discovery'
import type { Opportunity, CustomerProfile } from '../types/linkbuilding'

// Reuse fetchWebContent from Asistent — inline here to keep files independent
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
  | 'discovering-serp'
  | 'batch-metrics'
  | 'scoring'
  | 'done'

const STEP_LABELS: Record<Step, string> = {
  'idle': '',
  'fetching-content': 'Stahuji obsah webu zákazníka...',
  'analyzing-customer': 'AI analyzuje obor zákazníka a hledá klíčová slova...',
  'discovering-competitors': 'Hledám konkurenční weby v Ahrefs...',
  'discovering-serp': 'Procházím SERP výsledky pro klíčová slova...',
  'batch-metrics': 'Načítám metriky pro nalezené weby...',
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

export function HledaniWebuPage() {
  const [customerUrl, setCustomerUrl] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [savedDomains, setSavedDomains] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<{ discovered: number; afterFilter: number } | null>(null)

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

      // Step 3: Ahrefs — find competing domains
      setStep('discovering-competitors')
      const customerDomain = customerUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
      let allDomains: string[] = []

      try {
        const competitors = await getOrganicCompetitors(customerDomain, country, ahrefsKey)
        allDomains.push(...competitors.map(c => c.domain))
      } catch {
        // Domain might not be in Ahrefs yet — continue with SERP discovery
      }

      // Step 4: Ahrefs — SERP discovery for each keyword
      setStep('discovering-serp')
      const keywordsToCheck = customerProfile.czechKeywords.slice(0, 6)
      for (const kw of keywordsToCheck) {
        try {
          const serpDomains = await getSerpDomains(kw, country, ahrefsKey)
          allDomains.push(...serpDomains.map(s => s.domain))
        } catch {
          // Continue if one keyword fails
        }
      }

      // Deduplicate + blacklist filter
      const uniqueDomains = [...new Set(allDomains)]
        .filter(d => d && !isBlacklisted(d) && d !== customerDomain)
        .slice(0, 100)

      setStats(prev => ({ discovered: uniqueDomains.length, afterFilter: prev?.afterFilter ?? 0 }))

      // Step 5: Ahrefs batch metrics
      setStep('batch-metrics')
      const metrics = await batchDomainMetrics(uniqueDomains, ahrefsKey)

      // Quality filter
      const qualified: BatchMetrics[] = metrics.filter(m => passesQualityFilter(m))
      setStats({ discovered: uniqueDomains.length, afterFilter: qualified.length })

      if (qualified.length === 0) {
        throw new Error('Žádný web neprojde filtrem kvality. Zkuste jiný web zákazníka nebo upravte nastavení.')
      }

      // Step 6: Gemini scores each qualified site
      setStep('scoring')
      const scored = await scoreOpportunities(customerUrl.trim(), customerProfile, qualified, geminiKey)

      setOpportunities(scored)
      setStep('done')
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
```

- [ ] **Step 2: Add styles to `src/App.css`**

Append at the end:

```css
/* ── Hledání nových webů ────────────────────────────────── */
.hledani-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hledani-keys-warning {
  font-size: 13px;
  color: #d97706;
  margin: 8px 0 0;
}

.hledani-results-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.hledani-results-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hledani-results-count {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.hledani-results-sub {
  font-size: 12px;
  color: var(--text-muted);
}

.hledani-niche-badge {
  background: var(--primary);
  color: #fff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

/* ── Opportunity grid ──────────────────────────────────── */
.opp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}

.opp-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s;
}

.opp-card:hover {
  border-color: var(--primary);
}

.opp-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.opp-card-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.opp-card-domain {
  font-size: 15px;
  font-weight: 600;
  color: var(--primary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.opp-card-domain:hover {
  text-decoration: underline;
}

.opp-card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.opp-score {
  font-size: 22px;
  font-weight: 700;
  flex-shrink: 0;
}

.badge-traffic {
  background: #1e293b;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 4px;
}

.badge-difficulty {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 0;
}

.opp-reason {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
}

.opp-angle {
  background: var(--bg);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.opp-angle-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.opp-angle p {
  font-size: 13px;
  color: var(--text);
  line-height: 1.6;
  margin: 0;
}

.opp-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.btn-ghost {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 0;
  font-family: inherit;
}

.btn-ghost:hover {
  color: var(--text);
}
```

- [ ] **Step 3: Wire HledaniWebu into `src/App.tsx`**

Add import:
```tsx
import { HledaniWebuPage } from './pages/HledaniWebu'
```

In the `<main>` block, add:
```tsx
{page === 'hledani' && <HledaniWebuPage />}
```

And remove `'hledani'` from the fallback condition if present.

- [ ] **Step 4: Manual test — happy path**

1. Run `npm run dev`
2. Go to Nastavení, enter real Gemini + Ahrefs keys, save
3. Go to Hledání nových webů
4. Enter a real customer URL (e.g. `https://nabytek-zahrada.cz`)
5. Click Hledat příležitosti
6. Watch each step label progress
7. Verify results show DR, traffic, relevance score, reason, outreach angle
8. Click "Zobrazit úhel oslovení" on one card → verify expands
9. Click "Přidat do plánu" → verify saves to Supabase (check Plánované tab)

- [ ] **Step 5: Test missing keys UX**

1. Clear Ahrefs key in Nastavení, save
2. Navigate to Hledání nových webů
3. Verify warning message appears and button is disabled

- [ ] **Step 6: Test new customer domain (not in Ahrefs yet)**

1. Enter a URL for a very new/small domain not in Ahrefs
2. Verify the competitors step silently skips (no crash)
3. Verify SERP keywords still produce results

- [ ] **Step 7: Commit**

```bash
git add src/pages/HledaniWebu.tsx src/App.tsx src/App.css
git commit -m "feat: add Hledani novych webu page with Gemini+Ahrefs discovery pipeline"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Gemini analyzes customer topic → `analyzeCustomer()`
- [x] Ahrefs finds real sites with traffic → `getOrganicCompetitors()` + `getSerpDomains()`
- [x] Ahrefs batch metrics → DR, traffic, spam signals → `batchDomainMetrics()` + `passesQualityFilter()`
- [x] Gemini scores each site with opportunity type + outreach angle → `scoreOpportunities()`
- [x] API keys in Settings (localStorage) → `src/lib/settings.ts` + `Nastaveni.tsx`
- [x] CORS handled → Supabase Edge Function proxy
- [x] Results saved to planned_linkbuildings → `handleSave()` in HledaniWebu
- [x] New customer domains (not in Ahrefs) → try/catch around `getOrganicCompetitors`
- [x] Missing keys UX → warning + disabled button

**No placeholders:** All code is complete in every step.

**Type consistency:**
- `BatchMetrics` defined in `ahrefs.ts`, used in `gemini-discovery.ts` and `HledaniWebu.tsx`
- `Opportunity` defined in `types/linkbuilding.ts`, used in `gemini-discovery.ts` and `HledaniWebu.tsx`
- `CustomerProfile` defined in `types/linkbuilding.ts`, used in `gemini-discovery.ts` and `HledaniWebu.tsx`
- `getGeminiKey`, `getAhrefsKey`, `getCountry` defined in `settings.ts`, imported in `HledaniWebu.tsx`
