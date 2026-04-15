import { useEffect } from 'react'
import { useBacklinkAnalysis, type AnalyzaResult } from '../hooks/useBacklinkAnalysis'

interface Props {
  url: string
  dr: number | null
  onClose: () => void
}

function scoreCircleColor(skore: number): string {
  if (skore >= 75) return '#16a34a'
  if (skore >= 50) return '#d97706'
  return '#dc2626'
}

function ratingDotColor(hodnoceni: string): string {
  const map: Record<string, string> = {
    'Výborný': '#16a34a',
    'Dobrý': '#d97706',
    'Průměrný': '#ea580c',
    'Slabý': '#dc2626',
  }
  return map[hodnoceni] ?? '#94a3b8'
}

const ANALYZA_CARDS: { key: keyof AnalyzaResult['analyza']; label: string; icon: string }[] = [
  { key: 'autorita',    label: 'Autorita zdroje',   icon: 'building' },
  { key: 'relevance',   label: 'Relevance',          icon: 'globe' },
  { key: 'anchor_text', label: 'Anchor text',         icon: 'cursor' },
  { key: 'typ_odkazu',  label: 'Typ odkazu',          icon: 'link' },
  { key: 'traffic',     label: 'Traffic potenciál',   icon: 'chart' },
  { key: 'rizika',      label: 'Rizika',              icon: 'warning' },
]

const CARD_ICONS: Record<string, JSX.Element> = {
  building: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22v-4h6v4"/>
      <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/>
    </svg>
  ),
  globe: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/>
    </svg>
  ),
  cursor: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/>
    </svg>
  ),
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  chart: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
}

export function AnalyzaOdkazuDrawer({ url, dr, onClose }: Props) {
  const { status, result, error, analyze, reset } = useBacklinkAnalysis()

  useEffect(() => {
    analyze(url, dr)
    return () => reset()
  }, [url, dr, analyze, reset])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const isLoading = status === 'loading-metrics' || status === 'loading-ai'

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="drawer-panel">
        {/* Header */}
        <div className="drawer-header">
          <div>
            <p className="drawer-title">Analýza zpětného odkazu</p>
            <a
              href={url.startsWith('http') ? url : `https://${url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="drawer-url"
            >
              {url}
            </a>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Zavřít">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {isLoading && (
            <div className="drawer-loading">
              <div className="spinner" />
              <p>{status === 'loading-metrics' ? 'Načítám metriky z Ahrefs...' : 'AI analyzuje odkaz...'}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="drawer-error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>{error}</p>
            </div>
          )}

          {status === 'done' && result && (
            <AnalyzaContent result={result} />
          )}
        </div>
      </div>
    </>
  )
}

function AnalyzaContent({ result }: { result: AnalyzaResult }) {
  const circleColor = scoreCircleColor(result.skore)
  const dotColor = ratingDotColor(result.hodnoceni)

  return (
    <>
      {/* Score card */}
      <div className="analyza-score-card">
        <div className="analyza-score-circle" style={{ background: circleColor }}>
          {result.skore}
        </div>
        <div>
          <div className="analyza-score-label">
            <span className="analyza-rating-dot" style={{ background: dotColor }} />
            <span className="analyza-rating-text">{result.hodnoceni}</span>
          </div>
          <p className="analyza-score-sub">Celkové SEO skóre odkazu</p>
        </div>
      </div>

      {/* Summary */}
      <div className="analyza-summary">
        {result.summary}
      </div>

      {/* Detail cards */}
      <p className="analyza-section-label">Detailní analýza</p>
      <div className="analyza-cards-grid">
        {ANALYZA_CARDS.map(card => (
          <div key={card.key} className="analyza-card">
            <div className="analyza-card-header">
              <span className="analyza-card-icon">{CARD_ICONS[card.icon]}</span>
              <span className="analyza-card-title">{card.label}</span>
            </div>
            <p className="analyza-card-text">{result.analyza[card.key]}</p>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      {result.doporuceni && (
        <div className="analyza-doporuceni">
          <p className="analyza-doporuceni-label">Doporučení</p>
          <p className="analyza-doporuceni-text">{result.doporuceni}</p>
        </div>
      )}
    </>
  )
}
