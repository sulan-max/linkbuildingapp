import type { WebEntry } from '../types/linkbuilding'

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;|/.()\[\]"']+/)
    .map(w => w.trim())
    .filter(w => w.length > 3)
}

function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true
  // Czech stem prefix matching (handles inflection)
  const prefixLen = Math.min(6, Math.min(a.length, b.length))
  if (prefixLen >= 5 && a.slice(0, prefixLen) === b.slice(0, prefixLen)) return true
  return false
}

function entryText(entry: WebEntry): string {
  // Extract domain words from URL (e.g. "dobrejedlo" → meaningful word)
  const domainWords = entry.url
    .replace(/https?:\/\//, '')
    .replace(/www\./, '')
    .split(/[./\-_]/)[0] ?? ''

  return [
    entry.kategorie,
    entry.ai,
    entry.kdeMuzeme,
    entry.portfolio,
    entry.kdeNepouzivat,
    domainWords,
  ].filter(Boolean).join(' ')
}

function findMatchedKeywords(entry: WebEntry, keywords: string[]): string[] {
  const haystack = tokenize(entryText(entry))
  return keywords.filter(kw =>
    haystack.some(h => wordsMatch(kw.toLowerCase(), h))
  )
}

function drScore(dr: number | null): number {
  if (dr === null) return 25
  return Math.round((Math.min(dr, 80) / 80) * 100)
}

function availabilityScore(entry: WebEntry): number {
  if (entry.kdeMuzeme?.trim()) return 100
  if (entry.kdeNepouzivat?.trim()) return 0
  return 50
}

function priceScore(cena: string): number {
  const num = parseFloat(cena?.replace(/[^0-9.]/g, ''))
  if (isNaN(num)) return 50
  if (num < 500) return 100
  if (num <= 1500) return 60
  return 20
}

function buildReason(entry: WebEntry, matched: string[], rel: number): string {
  const category = entry.kategorie?.split(',')[0].trim()
  const where = entry.kdeMuzeme?.trim()

  if (matched.length >= 4) {
    return `Velmi silná tematická shoda — klíčová slova: ${matched.slice(0, 5).join(', ')}.${category ? ` Kategorie: ${category}.` : ''}`
  }
  if (matched.length >= 2) {
    return `Dobrá shoda (${matched.join(', ')})${category ? `, kategorie: ${category}` : ''}.${where ? ` Dostupné pro: ${where}.` : ''}`
  }
  if (matched.length === 1) {
    return `Slabá tematická shoda (${matched[0]})${category ? `, kategorie: ${category}` : ''}. Hodnocen dle DR a dostupnosti.`
  }
  if (rel === 0 && (entry.dr ?? 0) >= 50) {
    return `Žádná přímá shoda, ale vysoké DR ${entry.dr}${category ? ` (${category})` : ''} — vhodné pro obecný linkbuilding.`
  }
  return `Doporučen dle DR ${entry.dr ?? '—'} a dostupnosti${category ? ` (${category})` : ''}.`
}

export interface ScoredEntry extends WebEntry {
  score: number
  themeReason: string
}

export function scoreEntries(entries: WebEntry[], _topic: string, keywords: string[]): ScoredEntry[] {
  return entries
    .map(entry => {
      const matched = findMatchedKeywords(entry, keywords)
      const rel = keywords.length > 0 ? Math.round((matched.length / keywords.length) * 100) : 0
      const dr = drScore(entry.dr)
      const avail = availabilityScore(entry)
      const price = priceScore(entry.cena)

      // Theme relevance is the dominant factor (55 %)
      const score = Math.round(rel * 0.55 + dr * 0.25 + avail * 0.15 + price * 0.05)
      const themeReason = buildReason(entry, matched, rel)

      return { ...entry, score, themeReason }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}
