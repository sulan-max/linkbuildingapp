import { useState, useMemo, useCallback, type MouseEvent } from 'react'
import { CLIENTS } from '../config/clients'
import { useLinkbuildingSheet, type LinkRow } from '../hooks/useLinkbuildingSheet'
import { getGeminiKey } from '../lib/settings'

// ── Helpers ──────────────────────────────────────────────────────

function parseSortKey(mesicRok: string): number {
  const m = mesicRok.match(/^(\d{1,2})\/(\d{4})$/)
  if (!m) return 0
  return parseInt(m[2]) * 100 + parseInt(m[1])
}

function currentMonthLabel(): string {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function lastMonthLabel(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
  }
}

// ── Stats computation ─────────────────────────────────────────────

interface Stats {
  total: number
  avgDr: number | null
  thisMesic: number
  lastMesic: number
  bestDr: number | null
  bestUrl: string
}

function computeStats(rows: LinkRow[]): Stats {
  const total = rows.length
  const withDr = rows.filter(r => r.drDa !== null)
  const avgDr = withDr.length > 0
    ? Math.round(withDr.reduce((s, r) => s + r.drDa!, 0) / withDr.length)
    : null

  const thisLabel = currentMonthLabel()
  const lastLabel = lastMonthLabel()
  const thisMesic = rows.filter(r => r.mesicRok === thisLabel).length
  const lastMesic = rows.filter(r => r.mesicRok === lastLabel).length

  const best = withDr.length > 0
    ? withDr.reduce((a, b) => (b.drDa! > a.drDa! ? b : a))
    : null

  return {
    total,
    avgDr,
    thisMesic,
    lastMesic,
    bestDr: best?.drDa ?? null,
    bestUrl: best ? extractDomain(best.url) : '',
  }
}

interface MonthBucket {
  label: string
  count: number
}

function computeMonthBuckets(rows: LinkRow[]): MonthBucket[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    if (!r.mesicRok) continue
    map.set(r.mesicRok, (map.get(r.mesicRok) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => parseSortKey(a[0]) - parseSortKey(b[0]))
    .map(([label, count]) => ({ label, count }))
}

interface DrBucket {
  label: string
  color: string
  count: number
}

function computeDrBuckets(rows: LinkRow[]): DrBucket[] {
  const withDr = rows.filter(r => r.drDa !== null)
  const b60 = withDr.filter(r => r.drDa! >= 60).length
  const b40 = withDr.filter(r => r.drDa! >= 40 && r.drDa! < 60).length
  const b20 = withDr.filter(r => r.drDa! >= 20 && r.drDa! < 40).length
  const b0  = withDr.filter(r => r.drDa! < 20).length
  return [
    { label: 'DR 60+',   color: '#16a34a', count: b60 },
    { label: 'DR 40–59', color: '#2563eb', count: b40 },
    { label: 'DR 20–39', color: '#a16207', count: b20 },
    { label: 'DR 0–19',  color: '#dc2626', count: b0  },
  ]
}

interface AvgDrMonth {
  label: string
  avgDr: number
}

function computeAvgDrByMonth(rows: LinkRow[]): AvgDrMonth[] {
  const map = new Map<string, number[]>()
  for (const r of rows) {
    if (!r.mesicRok || r.drDa === null) continue
    const arr = map.get(r.mesicRok) ?? []
    arr.push(r.drDa)
    map.set(r.mesicRok, arr)
  }
  return [...map.entries()]
    .sort((a, b) => parseSortKey(a[0]) - parseSortKey(b[0]))
    .map(([label, vals]) => ({
      label,
      avgDr: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
    }))
}

function topFiveByDr(rows: LinkRow[]): LinkRow[] {
  return [...rows]
    .filter(r => r.drDa !== null)
    .sort((a, b) => b.drDa! - a.drDa!)
    .slice(0, 5)
}

type RangeFilter = '3m' | '6m' | '1y' | 'all'

function filterMonthBuckets(buckets: MonthBucket[], range: RangeFilter): MonthBucket[] {
  if (range === 'all') return buckets
  const n = range === '3m' ? 3 : range === '6m' ? 6 : 12
  return buckets.slice(-n)
}

function computeCumulativeAvgDr(rows: LinkRow[]): AvgDrMonth[] {
  const monthlyMap = new Map<string, number[]>()
  for (const r of rows) {
    if (!r.mesicRok || r.drDa === null) continue
    const arr = monthlyMap.get(r.mesicRok) ?? []
    arr.push(r.drDa)
    monthlyMap.set(r.mesicRok, arr)
  }
  const sorted = [...monthlyMap.entries()]
    .sort((a, b) => parseSortKey(a[0]) - parseSortKey(b[0]))
  const result: AvgDrMonth[] = []
  let allVals: number[] = []
  for (const [label, vals] of sorted) {
    allVals = allVals.concat(vals)
    result.push({
      label,
      avgDr: Math.round(allVals.reduce((s, v) => s + v, 0) / allVals.length),
    })
  }
  return result
}

// ── DR badge class ────────────────────────────────────────────────

function getDrClass(dr: number | null): string {
  if (dr === null) return 'dr-gray'
  if (dr >= 60) return 'dr-green'
  if (dr >= 40) return 'dr-blue'
  if (dr >= 20) return 'dr-amber'
  return 'dr-red'
}

// ── Column chart SVG ──────────────────────────────────────────────

function ColumnChart({
  buckets,
  rangeFilter,
  onRangeChange,
}: {
  buckets: MonthBucket[]
  rangeFilter: RangeFilter
  onRangeChange: (r: RangeFilter) => void
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const filtered = filterMonthBuckets(buckets, rangeFilter)
  const maxCount = filtered.length > 0 ? Math.max(...filtered.map(m => m.count)) : 1

  const W = 800, H = 220
  const PAD = { top: 12, right: 12, bottom: 32, left: 12 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const n = filtered.length
  const slotW = n > 0 ? chartW / n : 0
  const barW = Math.max(8, slotW * 0.55)
  const currentMonth = currentMonthLabel()

  function handleMouseMove(e: MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W - PAD.left
    const idx = Math.floor(x / slotW)
    setHoveredIdx(idx >= 0 && idx < n ? idx : null)
  }

  return (
    <div>
      <div className="stat-range-pills">
        {(['3m', '6m', '1y', 'all'] as RangeFilter[]).map(r => (
          <button
            key={r}
            className={`stat-range-pill${rangeFilter === r ? ' active' : ''}`}
            onClick={() => onRangeChange(r)}
          >
            {r === '3m' ? '3M' : r === '6m' ? '6M' : r === '1y' ? '1R' : 'Vše'}
          </button>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {filtered.map((m, i) => {
            const barH = maxCount > 0 ? (m.count / maxCount) * chartH : 0
            const x = PAD.left + i * slotW + (slotW - barW) / 2
            const y = PAD.top + chartH - barH
            const isCurrent = m.label === currentMonth
            const isHovered = hoveredIdx === i
            return (
              <g key={m.label}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={4}
                  fill={isCurrent ? '#e3341b' : isHovered ? '#f87171' : '#fca5a5'}
                />
                <text
                  x={PAD.left + i * slotW + slotW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#94a3b8"
                >
                  {m.label}
                </text>
              </g>
            )
          })}
        </svg>
        {hoveredIdx !== null && filtered[hoveredIdx] && (
          <div
            className="stat-tooltip"
            style={{
              left: `${((PAD.left + hoveredIdx * slotW + slotW / 2) / W) * 100}%`,
              top: 4,
            }}
          >
            <div className="stat-tooltip-month">{filtered[hoveredIdx].label}</div>
            <div className="stat-tooltip-val">{filtered[hoveredIdx].count} odkazů</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Donut SVG ─────────────────────────────────────────────────────

const CIRC = 2 * Math.PI * 40 // ≈ 251.33

function DonutChart({ buckets, total }: { buckets: DrBucket[]; total: number }) {
  let offset = 0
  const segments = buckets.map(b => {
    const dash = total > 0 ? (b.count / total) * CIRC : 0
    const seg = { ...b, dash, offset }
    offset += dash
    return seg
  })

  return (
    <div className="stat-donut-section">
      <div className="stat-donut-wrap">
        <svg className="stat-donut-svg" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r="40" fill="none" stroke="#f1f5f9" strokeWidth="18" />
          {segments.map(seg => (
            <circle
              key={seg.label}
              cx="55" cy="55" r="40"
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
              strokeDasharray={`${seg.dash} ${CIRC - seg.dash}`}
              strokeDashoffset={-seg.offset}
              transform="rotate(-90 55 55)"
            />
          ))}
        </svg>
        <div className="stat-donut-center">
          <div className="stat-donut-val">{total}</div>
          <div className="stat-donut-sub">odkazů</div>
        </div>
      </div>
      <div className="stat-dr-legend">
        {buckets.map(b => (
          <div key={b.label} className="stat-leg-item">
            <span className="stat-leg-dot" style={{ background: b.color }} />
            {b.label}&nbsp;({b.count})
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Dual line chart SVG ───────────────────────────────────────────

function DualLineChart({
  monthly,
  cumulative,
}: {
  monthly: AvgDrMonth[]
  cumulative: AvgDrMonth[]
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (monthly.length === 0) return <p className="stat-empty-note">Nedostatek dat</p>

  const W = 800, H = 200
  const PAD = { top: 12, right: 12, bottom: 30, left: 12 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const n = monthly.length

  const allVals = [...monthly.map(p => p.avgDr), ...cumulative.map(p => p.avgDr)]
  const minVal = Math.min(...allVals)
  const maxVal = Math.max(...allVals)
  const range = maxVal - minVal || 1

  // show at most ~10 X-axis labels to prevent overlap
  const labelStep = Math.max(1, Math.ceil(n / 10))

  function coords(points: AvgDrMonth[]) {
    return points.map((p, i) => ({
      x: PAD.left + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW),
      y: PAD.top + chartH - ((p.avgDr - minVal) / range) * chartH,
    }))
  }

  const mCoords = coords(monthly)
  const cCoords = coords(cumulative)
  const mPoly = mCoords.map(c => `${c.x},${c.y}`).join(' ')
  const cPoly = cCoords.map(c => `${c.x},${c.y}`).join(' ')

  function handleMouseMove(e: MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W - PAD.left
    const raw = n === 1 ? 0 : Math.round((x / chartW) * (n - 1))
    setHoveredIdx(raw >= 0 && raw < n ? raw : null)
  }

  const hx = hoveredIdx !== null ? mCoords[hoveredIdx].x : null

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Cumulative avg — dashed gray */}
          <polyline
            points={cPoly}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Monthly avg — solid red */}
          <polyline
            points={mPoly}
            fill="none"
            stroke="#e3341b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Cursor line */}
          {hx !== null && (
            <line
              x1={hx} y1={PAD.top}
              x2={hx} y2={PAD.top + chartH}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
          )}
          {/* X labels — skip to prevent overlap */}
          {monthly.map((p, i) => (
            (i % labelStep === 0 || i === n - 1) && (
              <text
                key={p.label}
                x={PAD.left + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW)}
                y={H - 6}
                textAnchor="middle"
                fontSize="11"
                fill="#94a3b8"
              >
                {p.label}
              </text>
            )
          ))}
        </svg>
        {hoveredIdx !== null && hx !== null && monthly[hoveredIdx] && cumulative[hoveredIdx] && (
          <div
            className="stat-tooltip"
            style={{
              left: `${(hx / W) * 100}%`,
              top: 4,
            }}
          >
            <div className="stat-tooltip-month">{monthly[hoveredIdx].label}</div>
            <div className="stat-tooltip-val" style={{ color: '#fca5a5' }}>
              Měs. DR: {monthly[hoveredIdx].avgDr}
            </div>
            <div className="stat-tooltip-val" style={{ color: '#cbd5e1' }}>
              Kumul.: {cumulative[hoveredIdx].avgDr}
            </div>
          </div>
        )}
      </div>
      <div className="stat-dual-legend">
        <span className="stat-leg-item">
          <span className="stat-leg-dot" style={{ background: '#e3341b' }} />
          Měsíční průměr DR
        </span>
        <span className="stat-leg-item">
          <span className="stat-leg-dot" style={{ background: '#94a3b8' }} />
          Kumulativní průměr
        </span>
      </div>
    </div>
  )
}

// ── AI Analysis ───────────────────────────────────────────────────

interface AiInsight {
  type: 'good' | 'warn' | 'tip'
  title: string
  text: string
}

interface AiResult {
  skore: number
  hodnoceni: string
  insights: AiInsight[]
}

function buildAiPrompt(clientName: string, stats: Stats, buckets: DrBucket[], months: MonthBucket[]): string {
  const dist = buckets.map(b => `${b.label}: ${b.count}`).join(', ')
  const trend = months.slice(-4).map(m => `${m.label}: ${m.count}`).join(', ')
  return `Jsi expert na SEO linkbuilding. Analyzuj profil zpětných odkazů a vrať hodnocení.

KLIENT: ${clientName}
- Celkem odkazů: ${stats.total}
- Průměrný DR: ${stats.avgDr ?? 'N/A'}
- Tento měsíc: ${stats.thisMesic} odkazů
- Nejlepší DR: ${stats.bestDr ?? 'N/A'} (${stats.bestUrl})
- DR distribuce: ${dist}
- Trend (poslední 4 měsíce): ${trend}

Vrať POUZE JSON (bez markdown, bez backtick):
{
  "skore": číslo 1.0 až 10.0,
  "hodnoceni": "Výborné|Dobré|Průměrné|Slabé",
  "insights": [
    {"type": "good", "title": "nadpis silné stránky", "text": "1-2 věty konkrétního pozorování"},
    {"type": "warn", "title": "nadpis slabiny", "text": "1-2 věty konkrétního problému"},
    {"type": "tip", "title": "nadpis doporučení", "text": "1-2 věty akčního doporučení"}
  ]
}`
}

async function callGeminiStats(prompt: string, key: string): Promise<AiResult> {
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
  return JSON.parse(text) as AiResult
}

const INSIGHT_ICON: Record<string, JSX.Element> = {
  good: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  warn: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  tip: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
}

function scoreColor(s: number): string {
  if (s >= 7) return '#16a34a'
  if (s >= 5) return '#d97706'
  return '#dc2626'
}

// ── Main page ─────────────────────────────────────────────────────

export function StatistikyPage() {
  const [clientIdx, setClientIdx] = useState(0)
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('3m')
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const client = CLIENTS[clientIdx]
  const { rows, loading, error } = useLinkbuildingSheet(client)

  const stats       = useMemo(() => computeStats(rows), [rows])
  const months      = useMemo(() => computeMonthBuckets(rows), [rows])
  const drBuckets   = useMemo(() => computeDrBuckets(rows), [rows])
  const avgDrData   = useMemo(() => computeAvgDrByMonth(rows), [rows])
  const cumulDrData = useMemo(() => computeCumulativeAvgDr(rows), [rows])
  const top5        = useMemo(() => topFiveByDr(rows), [rows])

  const currentMonth = currentMonthLabel()

  const handleAiAnalyze = useCallback(async () => {
    const key = getGeminiKey()
    if (!key) {
      setAiError('Chybí Gemini API klíč — nastav ho v Nastavení.')
      return
    }
    setAiLoading(true)
    setAiResult(null)
    setAiError(null)
    try {
      const prompt = buildAiPrompt(client.name, stats, drBuckets, months)
      const result = await callGeminiStats(prompt, key)
      setAiResult(result)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err))
    } finally {
      setAiLoading(false)
    }
  }, [client.name, stats, drBuckets, months])

  return (
    <div className="statistiky-page">

      {/* Client selector */}
      <div className="statistiky-client-row">
        <select
          className="statistiky-client-select"
          value={clientIdx}
          onChange={e => { setClientIdx(Number(e.target.value)); setAiResult(null) }}
        >
          {CLIENTS.map((c, i) => (
            <option key={i} value={i}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="page-state">
          <div className="spinner" />
          <p>Načítám data pro {client.name}...</p>
        </div>
      )}

      {error && (
        <div className="page-state error">
          <span>⚠️</span><p>{error}</p>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="page-state">
          <p>Žádná data v sheetu.</p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          {/* 4 stat cards */}
          <div className="stat-cards-grid">
            <div className="stat-karta">
              <div className="stat-karta-label">Celkem odkazů</div>
              <div className="stat-karta-val">{stats.total}</div>
              <div className="stat-karta-sub">za všechny měsíce</div>
            </div>
            <div className="stat-karta">
              <div className="stat-karta-label">Průměrný DR</div>
              <div className="stat-karta-val">{stats.avgDr ?? '—'}</div>
              <div className="stat-karta-sub">z {rows.filter(r => r.drDa !== null).length} odkazů</div>
            </div>
            <div className="stat-karta">
              <div className="stat-karta-label">Tento měsíc</div>
              <div className="stat-karta-val">{stats.thisMesic}</div>
              <div className="stat-karta-sub">
                {stats.lastMesic > 0 && (
                  <span className={stats.thisMesic >= stats.lastMesic ? 'stat-trend-up' : 'stat-trend-down'}>
                    {stats.thisMesic >= stats.lastMesic ? '↑' : '↓'} {stats.thisMesic >= stats.lastMesic ? '+' : ''}{stats.thisMesic - stats.lastMesic}
                  </span>
                )}{' '}
                vs minulý měsíc
              </div>
            </div>
            <div className="stat-karta">
              <div className="stat-karta-label">Nejlepší DR</div>
              <div className="stat-karta-val" style={{ color: '#16a34a' }}>{stats.bestDr ?? '—'}</div>
              <div className="stat-karta-sub">{stats.bestUrl || '—'}</div>
            </div>
          </div>

          {/* Column chart — full width */}
          <div className="stat-chart-card">
            <div className="stat-chart-title">Počet odkazů po měsících</div>
            <ColumnChart
              buckets={months}
              rangeFilter={rangeFilter}
              onRangeChange={setRangeFilter}
            />
          </div>

          {/* DR line chart — full width */}
          <div className="stat-chart-card">
            <div className="stat-chart-title">Průměrný DR v čase</div>
            <DualLineChart monthly={avgDrData} cumulative={cumulDrData} />
          </div>

          {/* Donut + top5 row */}
          <div className="stat-charts-row1">
            <div className="stat-chart-card">
              <div className="stat-chart-title">DR kvalita odkazů</div>
              <DonutChart buckets={drBuckets} total={rows.filter(r => r.drDa !== null).length} />
            </div>

            <div className="stat-chart-card">
              <div className="stat-chart-title">Top 5 nejlepších odkazů</div>
              <table className="stat-top-table">
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Měsíc</th>
                    <th>DR</th>
                  </tr>
                </thead>
                <tbody>
                  {top5.map((row, i) => (
                    <tr key={i}>
                      <td className="stat-top-url">
                        <a href={row.url.startsWith('http') ? row.url : `https://${row.url}`} target="_blank" rel="noopener noreferrer">
                          {extractDomain(row.url)}
                        </a>
                      </td>
                      <td className="stat-top-month">{row.mesicRok || '—'}</td>
                      <td>
                        <span className={`nas-lb-dr ${getDrClass(row.drDa)}`}>{row.drDa}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Analysis card */}
          <div className="stat-ai-card">
            <div className="stat-ai-header">
              <div className="stat-ai-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10"/>
                  <path d="M12 6v6l4 2"/>
                  <circle cx="19" cy="5" r="3" fill="white" stroke="none"/>
                </svg>
              </div>
              <div>
                <p className="stat-ai-title">AI analýza linkbuildingu</p>
                <p className="stat-ai-subtitle">Hodnocení profilu odkazů · {client.name} · {currentMonth}</p>
              </div>
              <button
                className="stat-ai-btn"
                onClick={handleAiAnalyze}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <>
                    <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                    Analyzuji...
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    {aiResult ? 'Přegenerovat' : 'Spustit analýzu'}
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <div className="drawer-error" style={{ margin: '0' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>{aiError}</p>
              </div>
            )}

            {aiResult && (
              <div className="stat-ai-body">
                <div className="stat-ai-score-section">
                  <div className="stat-ai-score-ring">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                      <circle
                        cx="40" cy="40" r="32"
                        fill="none"
                        stroke={scoreColor(aiResult.skore)}
                        strokeWidth="10"
                        strokeDasharray={`${(aiResult.skore / 10) * 201} ${201 - (aiResult.skore / 10) * 201}`}
                        strokeDashoffset="50"
                      />
                    </svg>
                    <div className="stat-ai-score-val" style={{ color: scoreColor(aiResult.skore) }}>
                      {aiResult.skore.toFixed(1)}
                    </div>
                  </div>
                  <p className="stat-ai-score-label">
                    Celkové skóre<br />
                    <strong style={{ color: scoreColor(aiResult.skore) }}>{aiResult.hodnoceni}</strong>
                  </p>
                </div>

                <div className="stat-ai-insights">
                  {aiResult.insights.map((ins, i) => (
                    <div key={i} className={`stat-insight stat-insight--${ins.type}`}>
                      <span className="stat-insight-icon">{INSIGHT_ICON[ins.type]}</span>
                      <span className="stat-insight-text">
                        <strong>{ins.title}.</strong> {ins.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!aiResult && !aiLoading && !aiError && (
              <p className="stat-ai-placeholder">
                Klikni na "Spustit analýzu" pro AI hodnocení profilu odkazů tohoto klienta.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
