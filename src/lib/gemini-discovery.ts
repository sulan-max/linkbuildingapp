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
  if (!res.ok) {
    const errBody = await res.json().catch(() => null) as { error?: { message?: string } } | null
    const msg = errBody?.error?.message ?? res.statusText
    throw new Error(`Gemini API chyba ${res.status}: ${msg}`)
  }
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
  try {
    return JSON.parse(raw) as CustomerProfile
  } catch {
    throw new Error(`analyzeCustomer: Gemini vrátil neplatný JSON. Začátek odpovědi: ${raw.slice(0, 200)}`)
  }
}

// ── Prompt 2: Opportunity scoring ──────────────────────────────

export async function scoreOpportunities(
  customerUrl: string,
  profile: CustomerProfile,
  sites: BatchMetrics[],
  geminiKey: string
): Promise<Opportunity[]> {
  if (sites.length === 0) return []

  const capped = sites.slice(0, 100)

  const siteList = capped
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
  let parsed: { opportunities: Array<{
    domain: string
    relevanceScore: number
    opportunityType: string
    outreachDifficulty: string
    reason: string
    outreachAngle: string
  }> }
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`scoreOpportunities: Gemini vrátil neplatný JSON. Začátek odpovědi: ${raw.slice(0, 200)}`)
  }

  const VALID_OPPORTUNITY_TYPES = new Set<OpportunityType>([
    'guest-post', 'resource-page', 'directory', 'mention',
    'product-review', 'news-coverage', 'broken-link',
  ])
  const VALID_DIFFICULTY = new Set<OutreachDifficulty>(['easy', 'medium', 'hard'])

  const metricsMap = new Map(capped.map(s => [s.domain, s]))

  return parsed.opportunities.map(o => {
    const m = metricsMap.get(o.domain)
    return {
      domain: o.domain,
      domain_rating: m?.domain_rating ?? null,
      org_traffic: m?.org_traffic ?? null,
      refdomains: m?.refdomains ?? null,
      relevanceScore: Math.min(100, Math.max(0, Math.round(o.relevanceScore))),
      opportunityType: VALID_OPPORTUNITY_TYPES.has(o.opportunityType as OpportunityType)
        ? (o.opportunityType as OpportunityType)
        : 'mention',
      outreachDifficulty: VALID_DIFFICULTY.has(o.outreachDifficulty as OutreachDifficulty)
        ? (o.outreachDifficulty as OutreachDifficulty)
        : 'medium',
      reason: o.reason,
      outreachAngle: o.outreachAngle,
    }
  })
}
