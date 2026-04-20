const SUPABASE_URL = 'https://njtjpbmudwhadozfpkll.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdGpwYm11ZHdoYWRvemZwa2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzYwMjEsImV4cCI6MjA5MTE1MjAyMX0.5XUVSVKTP28gM-tEfslp-EYWtCpBMtP51ExNd3YVtM4'
const PROXY_URL = `${SUPABASE_URL}/functions/v1/ahrefs-proxy`

// ── Internal helpers ────────────────────────────────────────────

function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    const msg = d.error ?? d.message ?? d.msg
    if (msg && typeof msg === 'string') return msg
    if (msg && typeof msg === 'object') {
      const inner = (msg as Record<string, unknown>).message ?? (msg as Record<string, unknown>).description
      if (inner) return String(inner)
    }
  }
  return `HTTP ${status}: ${JSON.stringify(data).slice(0, 200)}`
}

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
    signal: AbortSignal.timeout(55000),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(extractErrorMessage(data, res.status))
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
    signal: AbortSignal.timeout(55000),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(extractErrorMessage(data, res.status))
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
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Public types ────────────────────────────────────────────────

export interface CompetitorResult {
  domain: string
  domain_rating: number | null
  traffic: number | null
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
    limit: '20',
    order_by: 'traffic:desc',
  }, ahrefsKey) as { competitors?: Array<{
    competitor_domain: string
    domain_rating: number | null
    traffic: number | null
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

export interface SourceMetrics {
  domain: string
  domain_rating: number | null
  org_traffic: number | null
}

/** Get organic traffic and DR for a source URL domain (for backlink analysis). */
export async function getSourceMetrics(
  url: string,
  ahrefsKey: string
): Promise<SourceMetrics> {
  const domain = extractDomain(url)
  const data = await proxyGet('site-explorer/metrics', {
    target: domain,
    date: today(),
    select: 'domain_rating,org_traffic',
    mode: 'subdomains',
    protocol: 'both',
  }, ahrefsKey) as { domain_rating?: number | null; org_traffic?: number | null }

  return {
    domain,
    domain_rating: data.domain_rating ?? null,
    org_traffic: data.org_traffic ?? null,
  }
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
